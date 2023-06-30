#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MongoCdkTestingStack } from '../lib/mongodb-cdk-test-stack';
require('dotenv').config();

const app = new cdk.App();
new MongoCdkTestingStack(app, 'MongodbCdkStack', 
{  env: {
  account: process.env.AWS_ACCOUNT_ID,
  region: process.env.AWS_REGION,
},
});