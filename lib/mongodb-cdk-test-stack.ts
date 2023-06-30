// This CDK L3 example creates a MongoDB Atlas project, cluster, databaseUser, and projectIpAccessList
import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { AtlasBasic, AtlasBasicPrivateEndpoint } from 'awscdk-resources-mongodbatlas';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

interface AtlasStackProps {
  readonly orgId: string;
  readonly profile: string;
  readonly clusterName: string;
  readonly region: string;
  readonly ip: string;
}
class MyVpc extends Construct {
  readonly vpc: Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new Vpc(this, 'MyVPC', {
      cidr: "10.0.0.0/16",
      maxAzs: 2, // Default is all AZs in region
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'IsolatedSubnet',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        }
      ],
    });
  }
}
export class MongoCdkTestingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const atlasProps = this.getContextProps();
    const myVpc = new MyVpc(this, 'VPCConstruct');
    const l3ConstructId = 'AtlasBasic'
    const atlasBasic = new AtlasBasicPrivateEndpoint(this, l3ConstructId, {
      atlasBasicProps: {
        clusterProps: {
        name: atlasProps.clusterName,  
        replicationSpecs:   [
        {
            numShards: 1,
            advancedRegionConfigs: [
                {
                    analyticsSpecs: {
                        ebsVolumeType: "STANDARD",
                        instanceSize: "M10",
                        nodeCount: 1
                    },
                    electableSpecs: {
                        ebsVolumeType: "STANDARD",
                        instanceSize: "M10",
                        nodeCount: 3
                    },
                    priority:  7,
                    regionName: atlasProps.region,
                }]
        }]        
        },
        projectProps: {
          orgId: atlasProps.orgId,
        },
        dbUserProps: {  
          username: 'testUser',
          password: process.env.MONGODB_ATLAS_PASSWORD,
          roles: [
            {
              roleName: "atlasAdmin",
              databaseName: "admin",
            },
          ],
        },
        ipAccessListProps: {
          accessList:[
            { ipAddress: atlasProps.ip, comment: 'My first IP address' }
          ]
        },
      },
        privateEndpointProps: {
          privateEndpoints: [
            {
              vpcId: myVpc.vpc.vpcId,
              subnetIds: [myVpc.vpc.privateSubnets[0].subnetId, myVpc.vpc.privateSubnets[1].subnetId],
            }
    
          ]
        },
        profile: atlasProps.profile,
      });

      const AtlasBasicGroup = atlasBasic.node.findChild('atlas-basic-AtlasBasic')
      // const privateEndpointResource = atlasBasic.node.findChild('private-endpoint-AtlasBasic') as cdk.CfnResource
      const l3Groups = [...AtlasBasicGroup.node.findAll()]

      l3Groups.forEach((resource) => {
        const cfnResource = resource as cdk.CfnResource
        if(cfnResource.cfnOptions ){
          cfnResource.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
        }
        
      })
  }

  getContextProps(): AtlasStackProps {
    const orgId = process.env.MONGODB_ATLAS_ORGID;
    const ip = process.env.IP_ADDRESS;

    if (!orgId){
      throw "No context value specified for orgId. Please specify via the cdk context."
    }

    const profile = this.node.tryGetContext('profile') ?? 'yyCdkTest';
    const clusterName = this.node.tryGetContext('clusterName') ?? 'test-cluster';
    const region = this.node.tryGetContext('region') ?? "US_EAST_1";
    if (!ip){
      throw "No context value specified for ip. Please specify via the cdk context."
    }

    return {
      orgId,
      profile,
      clusterName,
      region,
      ip
    }
  }
}