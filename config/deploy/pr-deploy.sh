#!/bin/sh

CODE=~/code/timer.git
WEB=~/timer.reednj.com/public

rm -rf $WEB/*
cp $CODE/* $WEB/*
rm -rf $WEB/config
