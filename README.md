# expressJsTemplate for API Server

An api server (Node Express) template from [Vesta Rayan Afzar](http://vestarayanafzar.com)

This template is written in typescript.

This template has the following features:
 
 * Session 
 * Acl
 * Very well organized structure
 * gulp tasks for both develop and production mode

### How to run

#### Development
To start the server first you have to run `gulp` and then run `docker-compose up` on the root of the project.
The server will be listening on port `9003`(of course you can change it from docker-compose.yml in root directory) 
at your docker-engine address.
You can use [vesta](https://github.com/VestaRayanAfzar/vesta) code generator to create new models and controllers.
 
#### Production
There is a bash script in `resources/ci/deploy.sh` (change it to cover your needs).
`docker-compose.yml` for production mode is located at `resources/docker/` which you can modify to cover your circumstances.
You have to install [vesta](https://github.com/VestaRayanAfzar/vesta) platform. Then run `vesta deploy [http:///git/repo.git]`.

(Current configuration is set for behind nginx proxy)
