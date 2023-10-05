#!/bin/bash
current_branch=$(git symbolic-ref --short HEAD)
git checkout staging
git reset --hard $current_branch
git push -f origin staging
git checkout $current_branch