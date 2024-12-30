import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { IpAddresses, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Cluster, ContainerImage, FargateTaskDefinition, LogDriver, LogDrivers } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path = require('path');

export class AlbFargateCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'alb-fargate-queue');

    const vpc = new Vpc(this, 'alb-fargate-vpc', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'alb-fargate-public-subnet-1',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 22,
          name: 'alb-fargate-private-subnet-1',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 22,
          name: 'alb-fargate-private-subnet-2',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        },
      ],
    });

    const cluster = new Cluster(this, 'alb-fargate-cluster', {
      clusterName: 'alb-fargate-cluster',
      vpc,
    });

    // producer service
    const producerImgAsset = new DockerImageAsset(this, 'alb-fargate-producer-image', {
      directory: path.join(__dirname, 'services', 'producer-py'),
      platform: Platform.LINUX_AMD64,
    });
    const producerService = new ApplicationLoadBalancedFargateService(this, 'alb-fargate-producer-service', {
      cluster,
      memoryLimitMiB: 512,
      cpu: 256,
      taskImageOptions: {
        containerName: 'alb-fargate-producer-container',
        image: ContainerImage.fromDockerImageAsset(producerImgAsset),
        logDriver: LogDrivers.awsLogs({ streamPrefix: 'alb-fargate-producer' }),
        containerPort: 80,
        environment: {
          QUEUE_URL: queue.queueUrl,
        },
      },
    });
    producerService.targetGroup.configureHealthCheck({
      path: '/health',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });
    // grant send messages permission to the producer service
    queue.grantSendMessages(producerService.taskDefinition.taskRole);

    // consumer service
    const consumerImgAsset = new DockerImageAsset(this, 'alb-fargate-consumer-image', {
      directory: path.join(__dirname, 'services', 'consumer-py'),
      platform: Platform.LINUX_AMD64,
    });
    const consumerTaskDefinition = new FargateTaskDefinition(this, 'alb-fargate-consumer-task', {
      memoryLimitMiB: 512,
      cpu: 256,
    });
    const consumerContainer = consumerTaskDefinition.addContainer('alb-fargate-consumer-container', {
      containerName: 'alb-fargate-consumer-container',
      image: ContainerImage.fromDockerImageAsset(consumerImgAsset),
      logging: LogDriver.awsLogs({ streamPrefix: 'alb-fargate-consumer' }),
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
    });
    consumerContainer.addPortMappings({
      containerPort: 80,
    });
    const consumerService = new ApplicationLoadBalancedFargateService(this, 'alb-fargate-consumer-service', {
      cluster,
      taskDefinition: consumerTaskDefinition,
    });
    consumerService.targetGroup.configureHealthCheck({
      path: '/health',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });
    // grant consume messages permission to the consumer service
    queue.grantConsumeMessages(consumerService.taskDefinition.taskRole);
  }
}
