#!/bin/bash
cd $( dirname $0 )
jsdoc -d ../doc -c './jsdoc.json' ../src/dorito.js
