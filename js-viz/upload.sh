#!/usr/bin/env bash

# copy dirs and files to remote location
scp -r img js lib css fabian@eaf.smalldata.io:~/mac-js-viz/
scp index.html mobility.html download.html fabian@eaf.smalldata.io:~/mac-js-viz/

# echo files successfully uploaded
echo "Done copying files to remote location :)"

# open url to see page
open https://eaf.smalldata.io/partner/slm
