#!/bin/bash
project_name=$(basename $(pwd))

cd node_modules/base-node-workspace && ./remove_project $project_name && ./add_project $project_name && ./dev_project $project_name