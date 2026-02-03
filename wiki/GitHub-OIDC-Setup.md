# GitHub Actions OIDC Setup for AWS

This document explains how to configure AWS IAM to allow GitHub Actions to deploy without long-lived credentials.

## Overview

GitHub Actions uses OpenID Connect (OIDC) to request short-lived credentials from AWS. This eliminates the need to store AWS access keys as GitHub secrets.

## Step 1: Create OIDC Identity Provider in AWS

```bash
# Using AWS CLI
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --profile reply
```

Or via AWS Console:
1. Go to IAM > Identity providers > Add provider
2. Provider type: OpenID Connect
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`

## Step 2: Create IAM Role for GitHub Actions

Create a role with the following trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::718815871498:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Concept-Reply-US/EdgeMind:*"
        }
      }
    }
  ]
}
```

**Note:** Replace `Concept-Reply-US/EdgeMind` with your actual GitHub org/repo.

## Step 3: Attach Required Permissions

The role needs these permissions:

### For Frontend Deployment (S3 + CloudFront)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::edgemind-prod-frontend",
        "arn:aws:s3:::edgemind-prod-frontend/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::718815871498:distribution/*"
    }
  ]
}
```

### For Backend Deployment (ECR + ECS)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-1:718815871498:repository/edgemind-prod-backend"
    },
    {
      "Sid": "ECSTaskDefinition",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSServiceUpdate",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "arn:aws:ecs:us-east-1:718815871498:service/edgemind-prod/*"
    },
    {
      "Sid": "PassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::718815871498:role/edgemind-prod-backend-task-role",
        "arn:aws:iam::718815871498:role/edgemind-prod-backend-execution-role"
      ]
    }
  ]
}
```

## Step 4: Configure GitHub Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::718815871498:role/github-actions-edgemind` |
| `CLOUDFRONT_DISTRIBUTION_ID` | Your CloudFront distribution ID (from CDK output) |

## Quick Setup Script

```bash
# Create the role with trust policy
aws iam create-role \
  --role-name github-actions-edgemind \
  --assume-role-policy-document file://trust-policy.json \
  --profile reply

# Attach inline policy for deployments
aws iam put-role-policy \
  --role-name github-actions-edgemind \
  --policy-name deploy-permissions \
  --policy-document file://deploy-policy.json \
  --profile reply
```

## Verification

After setup, push a change to trigger the workflow. Check the Actions tab for:
- Successful OIDC credential fetch
- S3 sync completion
- CloudFront invalidation

## Troubleshooting

### "Not authorized to perform sts:AssumeRoleWithWebIdentity"
- Check the trust policy `sub` condition matches your repo name exactly
- Verify the OIDC provider exists in IAM

### "Access Denied" on S3/ECR/ECS
- Check the role has the required permissions
- Verify resource ARNs are correct

### CloudFront invalidation fails
- Ensure the distribution ID secret is set correctly
- Check CloudFront permissions in the role
