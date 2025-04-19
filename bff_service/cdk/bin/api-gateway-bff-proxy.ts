#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiGatewayBffProxyStack } from "../lib/api-gateway-bff-proxy-stack";

const app = new cdk.App();
new ApiGatewayBffProxyStack(app, "ApiGatewayBffProxyStack", {});
