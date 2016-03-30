#!/bin/bash

cd node_modules/base-node-workspace && ./add_project ../.. $(basename ../..) && ./dev_project $(basename ../..)