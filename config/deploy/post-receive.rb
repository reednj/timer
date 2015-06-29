#!/usr/bin/env ruby

# Aside from removing Ruby on Rails specific code this is taken verbatim from
# mislav's git-deploy (http://github.com/mislav/git-deploy) and it's awesome
#  - Ryan Florence (http://ryanflorence.com)
#
# Install this hook to a remote repository with a working tree, when you push
# to it, this hook will reset the head so the files are updated

if ENV['GIT_DIR'] == '.'
  # this means the script has been called as a hook, not manually.
  # get the proper GIT_DIR so we can descend into the working copy dir;
  # if we don't then `git reset --hard` doesn't affect the working tree.
  Dir.chdir('..')
  ENV['GIT_DIR'] = '.git'
end

cmd = %(bash -c "[ -f /etc/profile ] && source /etc/profile; echo $PATH")
envpath = IO.popen(cmd, 'r') { |io| io.read.chomp }
ENV['PATH'] = envpath

# find out the current branch
head = `git symbolic-ref HEAD`.chomp
# abort if we're on a detached head
exit unless $?.success?

oldrev = newrev = nil
null_ref = '0' * 40

# read the STDIN to detect if this push changed the current branch
while newrev.nil? and gets
  # each line of input is in form of "<oldrev> <newrev> <refname>"
  revs = $_.split
  oldrev, newrev = revs if head == revs.pop
end

# abort if there's no update, or in case the branch is deleted
exit if newrev.nil? or newrev == null_ref

# update the working copy
`umask 002 && git reset --hard`

if File.exists? "#{ENV['GIT_DIR']}/../config/deploy/pr-deploy.sh"
	`cp $GIT_DIR/../config/deploy/pr-deploy.sh $GIT_DIR/hooks/pr-deploy`
	`chmod 711 $GIT_DIR/hooks/pr-deploy`
end

if File.exists? "#{ENV['GIT_DIR']}/hooks/pr-deploy"
	`$GIT_DIR/hooks/pr-deploy`
end
