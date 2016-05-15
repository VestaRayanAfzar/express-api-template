#!/usr/bin/env bash

CLONE_PATH=$1
DEPLOY_PATH=$2
USE_SSL=$3
NGINX_PATH=$4
NGINX_CONFIG_FILE_NAME=$5
WD=`pwd`

print_status(){
  echo
  echo "====>    $1"
}

cd $CLONE_PATH
print_status "Cloning SubModules"
git checkout master
git submodule update --init src/cmn
git submodule foreach git checkout master

mv resources/gitignore/src/config/setting.var.ts src/config/setting.var.ts

print_status "Installing Node Packages"
npm install --no-progress
print_status "Running Deploy Tasks"
gulp deploy


print_status "Copying Dockerfile for Api Server..."
cp resources/docker/pm2/Dockerfile build/app/Dockerfile

print_status "Configuring NGINX"
cd $WD
mv ${CLONE_PATH}/resources/docker/nginx/http.conf ${NGINX_PATH}/conf.d/${NGINX_CONFIG_FILE_NAME}.conf.bak
cd $CLONE_PATH

print_status "Installing node packages for Web Server"
cp package.json build/app/api/package.json
cd build/app/api
npm install --production --no-progress

cd $WD
if [ -d $DEPLOY_PATH ]; then
  print_status "Stopping Previously Running Containers"
  cd $DEPLOY_PATH
  docker-compose stop
  docker-compose down
  cd $WD
fi

rm -rf $DEPLOY_PATH
mkdir -p $DEPLOY_PATH
mv ${CLONE_PATH}/build/app ${DEPLOY_PATH}/app
mv ${CLONE_PATH}/resources/docker/docker-compose-lb.yml ${DEPLOY_PATH}/docker-compose.yml

print_status "Starting Containers"
cd $DEPLOY_PATH
docker-compose up -d --build
print_status "All done"
print_status "Warning! DO NOT FORGET to update the volumes, networks, external_links of the NGINX docker-compose file"
exit 0