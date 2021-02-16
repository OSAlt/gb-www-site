[![Build Status](https://cloud.drone.io/api/badges/OSAlt/gb-docker-ghost/status.svg)](https://cloud.drone.io/OSAlt/gb-docker-ghost)

# Ghost GeekBeacon image

This is going to be used as a base for much of our docker deployment.  

The official docker image is a bit too limited and needed something that added a few more plugins for our use:

Additional Plugins:

  - GSS support  https://github.com/danmasta/ghost-gcs-adapter version 0.0.3
  - S3 support -- coming soon


Additional configuration added for GCS is:

```sh
## GCS 
storage__active=gcs
storage__gcs__bucket=gb-dev-testing
storage__gcs__host=storage.googleapis.com
storage__gcs__protocol=https
storage__gcs__hash=true
storage__gcs__hashAlgorithm=sha512
storage__gcs__hashLength=16

GOOGLE_APPLICATION_CREDENTIALS=/var/lib/ghost/keys/service.json
```

You'll need to add a service account with write support to the requested bucket.  The bucket also needs to be public in order to serve traffic.

By convention all the GCE keys are stored in the keys folder and then mounted as a volume to /var/lib/ghost/keys/

## DEVELOPMENT

symlink development.yml and enable email interception by enabling the following properties:

```sh 
ln -s development.yml docker-compose.yml

```

### Update environment 
```sh
## DEVEL ONLY
## MailHog Settings TESTING ONLY
mail__transport=SMTP
mail__options__port=1025
mail__options__host=mail
```

local email can be seen at:  http://localhost:8025/#
