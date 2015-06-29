#!/bin/sh

# create the remote repo, set the correct flag, and copy over the pr hook
cp ./post-receive.rb .git/hooks/post-receive
chmod 711 .git/hooks/post-receive
chmod 711 pr-deploy.sh

# make sure it will let us push
git config receive.denyCurrentBranch ignore
