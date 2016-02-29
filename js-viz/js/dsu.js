// token is set when user is redirected the first time
var dsu =
{
  dsu_url: "http://aws-qa.smalldata.io/dsu/",
  token: localStorage.token,

  _data: [],
  _skip: 0,
  _lastDate: null,
  NOT_FOUND: -1,

  query: function (args) {
    var skip = this._skip;
    var date = args["date"];
    var device = args["device"];
    var success = args["success"];
    var errorFunction = args["error"];
    var deferred = args["deferred"] || $.Deferred();

    // if the requested data available, call success callback and resolve promise,
    // if the returned data is earlier than the requested date but we haven't seen the requested data, call error callback
    // otherwise continue to get last 16 data points from the DSU
    var target = this._data.filter(function (d) {
      return d.date == date && d.device == device;
    });
    if (target.length) {
      success(target[0]);
      deferred.resolve(target);
    }
    else if (this._lastDate < date) {
      errorFunction("requested data not seen yet");
      deferred.reject(dsu.NOT_FOUND)
    } else {
      $.ajax({
        method: "GET",
        headers: {
          "Authorization": "Bearer " + dsu.token
        },
        url: dsu.dsu_url + "dataPoints",
        data: {
          schema_namespace: "cornell",
          schema_name: "mobility-daily-summary",
          schema_version: "2.0",
          chronological: "desc",
          skip: dsu._skip,
          limit: 16
        },
        success: function (result) {
          console.log("yayyy, dsu successful!!");
          console.log("query result:", result);

          if (result.length > 0) {
            var newData = result.map(
              function (r) {
                return r.body;
              });
            dsu._data =
              dsu._data.concat(newData);
            dsu._skip = skip + result.length;
            dsu._lastDate = result[result.length - 1].body.date;

            dsu.query({
              date: date,
              device: device,
              success: success,
              error: errorFunction,
              deferred: deferred
            });
          } else {
            // no more data, call error callback
            errorFunction("no more data");
            deferred.reject(dsu.NOT_FOUND)
          }
        },
        error: function (e, status, error) {
          // assume it is an authorization error. redirect to the sign in page
          console.log("ajax failed");
          console.log("e:", e, status, error);
          errorFunction("authorization error");

          var url = "http://aws-qa.smalldata.io/dsu/oauth/authorize?client_id=" +
            "io.smalldata.web.lifemap-dev&response_type=token";

          if (!dsu.token) {
            window.location.href = url;
          }
          else {
            console.log("Token exists:", dsu.token);
          }
        }

      });
      return deferred.promise();

    }

  }
};
