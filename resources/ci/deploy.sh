#!/usr/bin/env bash

CLONE_PATH=$1
DEPLOY_PATH=$2
NGINX_PATH="/etc/nginx/conf.d/api.conf"
NODE_PKG_CACHE_PATH=/tmp/armanApiServer_node_modules
WD=`pwd`
counter=0

npm_install(){
  BACKUP_PATH=${NODE_PKG_CACHE_PATH}_${1}

  if [ -d ${BACKUP_PATH} ]; then
    cp -R ${BACKUP_PATH} node_modules
  fi

  if [ $1 == "production" ]; then
    npm install --no-progress --production
  else
    npm install --no-progress
  fi;

  if [ -d ${BACKUP_PATH} ]; then
    rm -rf ${BACKUP_PATH}
  fi

  cp -R node_modules ${BACKUP_PATH}
}

print_status(){
  ((counter=counter+1))
  echo
  echo "${counter}: $1>"
  echo
}

cd ${CLONE_PATH}
print_status "Cloning SubModules"
git checkout master
git submodule update --init src/cmn
git submodule foreach git checkout master

mv resources/gitignore/src/config/setting.var.ts src/config/setting.var.ts

print_status "Installing Node Packages"
#npm install --no-progress
npm_install dev
print_status "Running Deploy Tasks"
gulp deploy

print_status "Configuring NGINX"
cd ${WD}
mv ${CLONE_PATH}/resources/docker/nginx.conf ${NGINX_PATH}
cd ${CLONE_PATH}

print_status "Installing node packages for Web Server"
cp package.json build/app/package.json
cd build/app
#npm install --production --no-progress
npm_install production

cd ${WD}
if [ -d ${DEPLOY_PATH} ]; then
  print_status "Stopping Previously Running Containers"
  cd ${DEPLOY_PATH}
  docker-compose stop
  docker-compose down
  cd ${WD}
fi

rm -rf ${DEPLOY_PATH}
mkdir -p ${DEPLOY_PATH}
mv ${CLONE_PATH}/build/app ${DEPLOY_PATH}/app
mv ${CLONE_PATH}/resources/docker/docker-compose.yml ${DEPLOY_PATH}/docker-compose.yml

print_status "Starting Containers"
cd ${DEPLOY_PATH}
docker-compose up -d --build
print_status "All done"
exit 0