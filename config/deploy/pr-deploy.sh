#!/bin/sh

CODE=~/code/timer.git
WEB=~/timer.reednj.com

rm -rf $WEB/*
cp -R $CODE/* $WEB
rm -rf $WEB/config

mkdir -p $WEB/tmp
touch $WEB/tmp/restart.txt
