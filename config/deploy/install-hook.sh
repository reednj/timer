#!/bin/sh

# hopefully get back to the app root directory
cd ../..

# create the remote repo, set the correct flag, and copy over the pr hook
cp ./config/deploy/post-receive.rb .git/hooks/post-receive
chmod 711 .git/hooks/post-receive
chmod 711 ./config/deploy/pr-deploy.sh

# make sure it will let us push
git config receive.denyCurrentBranch ignore
