#!/bin/bash
# EdgeMind EC2 Deployment Script
# Run this from your local machine with AWS CLI configured
#
# SECURITY NOTE: This script creates Secrets Manager secrets for credentials.
# Update the secrets after deployment using update-secrets.sh or AWS Console.

set -e

# Configuration - UPDATE THESE FOR YOUR ENVIRONMENT
INSTANCE_TYPE="t3.small"
KEY_NAME="edgemind-demo"
SECURITY_GROUP_NAME="edgemind-demo-sg"
INSTANCE_NAME="edgemind-demo"
REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# SECURITY: Restrict SSH access to your IP (set to your IP/CIDR)
# Use 0.0.0.0/0 only for initial setup, then restrict immediately
SSH_ALLOWED_CIDR="${SSH_ALLOWED_CIDR:-0.0.0.0/0}"

# ECR Configuration - UPDATE FOR YOUR ACCOUNT
ECR_ACCOUNT_ID="${ECR_ACCOUNT_ID:-}"
ECR_REPO_NAME="edgemind-prod-backend"

echo "🚀 Deploying EdgeMind to EC2..."

# Validate ECR account ID
if [ -z "$ECR_ACCOUNT_ID" ]; then
    ECR_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text --profile $AWS_PROFILE)
    echo "📦 Using AWS Account: $ECR_ACCOUNT_ID"
fi

# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --profile $AWS_PROFILE --region $REGION)
echo "📦 Using VPC: $VPC_ID"

# Get a public subnet
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" --query 'Subnets[0].SubnetId' --output text --profile $AWS_PROFILE --region $REGION)
echo "📦 Using Subnet: $SUBNET_ID"

# Create security group if it doesn't exist
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text --profile $AWS_PROFILE --region $REGION 2>/dev/null || echo "None")

if [ "$SG_ID" == "None" ] || [ -z "$SG_ID" ]; then
    echo "🔒 Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "EdgeMind demo security group" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text \
        --profile $AWS_PROFILE \
        --region $REGION)

    # SECURITY: SSH access - restricted to specified CIDR
    # WARNING: If using 0.0.0.0/0, restrict this immediately after setup!
    if [ "$SSH_ALLOWED_CIDR" == "0.0.0.0/0" ]; then
        echo "⚠️  WARNING: SSH is open to the world. Restrict SSH_ALLOWED_CIDR after setup!"
    fi
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $SSH_ALLOWED_CIDR --profile $AWS_PROFILE --region $REGION

    # Allow HTTP (backend API)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --profile $AWS_PROFILE --region $REGION

    # SECURITY: InfluxDB NOT exposed to internet - access via SSH tunnel only
    # To access InfluxDB: ssh -L 8086:localhost:8086 -i ~/.ssh/KEY.pem ec2-user@IP
    echo "🔒 InfluxDB port 8086 NOT exposed (use SSH tunnel for access)"
fi
echo "🔒 Using Security Group: $SG_ID"

# Create key pair if it doesn't exist
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --profile $AWS_PROFILE --region $REGION &>/dev/null; then
    echo "🔑 Creating key pair..."
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text --profile $AWS_PROFILE --region $REGION > ~/.ssh/${KEY_NAME}.pem
    chmod 400 ~/.ssh/${KEY_NAME}.pem
    echo "🔑 Key saved to ~/.ssh/${KEY_NAME}.pem"
fi

# Create Secrets Manager secrets if they don't exist
INFLUXDB_SECRET_NAME="edgemind/influxdb"
MQTT_SECRET_NAME="edgemind/mqtt"

echo "🔐 Setting up Secrets Manager..."

# Create InfluxDB secret
if ! aws secretsmanager describe-secret --secret-id $INFLUXDB_SECRET_NAME --profile $AWS_PROFILE --region $REGION &>/dev/null; then
    # Generate secure random credentials
    INFLUX_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    INFLUX_TOKEN=$(openssl rand -hex 32)

    aws secretsmanager create-secret \
        --name $INFLUXDB_SECRET_NAME \
        --description "EdgeMind InfluxDB credentials" \
        --secret-string "{\"username\":\"admin\",\"password\":\"${INFLUX_PASSWORD}\",\"token\":\"${INFLUX_TOKEN}\",\"org\":\"proveit\",\"bucket\":\"factory\"}" \
        --profile $AWS_PROFILE \
        --region $REGION
    echo "🔐 Created InfluxDB secret with generated credentials"
else
    echo "🔐 Using existing InfluxDB secret"
fi

# Create MQTT secret
if ! aws secretsmanager describe-secret --secret-id $MQTT_SECRET_NAME --profile $AWS_PROFILE --region $REGION &>/dev/null; then
    aws secretsmanager create-secret \
        --name $MQTT_SECRET_NAME \
        --description "EdgeMind MQTT credentials - UPDATE AFTER DEPLOYMENT" \
        --secret-string "{\"host\":\"mqtt://virtualfactory.proveit.services:1883\",\"username\":\"UPDATE_ME\",\"password\":\"UPDATE_ME\"}" \
        --profile $AWS_PROFILE \
        --region $REGION
    echo "🔐 Created MQTT secret - UPDATE credentials using update-secrets.sh!"
else
    echo "🔐 Using existing MQTT secret"
fi

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text \
    --profile $AWS_PROFILE \
    --region $REGION)
echo "📀 Using AMI: $AMI_ID"

# Create user-data script (credentials fetched from Secrets Manager at runtime)
USER_DATA=$(cat <<EOF
#!/bin/bash
set -ex

# Install Docker and AWS CLI
dnf update -y
dnf install -y docker git jq
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Fetch secrets from Secrets Manager
INFLUX_SECRET=\$(aws secretsmanager get-secret-value --secret-id ${INFLUXDB_SECRET_NAME} --region ${REGION} --query 'SecretString' --output text)
MQTT_SECRET=\$(aws secretsmanager get-secret-value --secret-id ${MQTT_SECRET_NAME} --region ${REGION} --query 'SecretString' --output text)

# Parse secrets
INFLUX_USER=\$(echo \$INFLUX_SECRET | jq -r '.username')
INFLUX_PASS=\$(echo \$INFLUX_SECRET | jq -r '.password')
INFLUX_TOKEN=\$(echo \$INFLUX_SECRET | jq -r '.token')
INFLUX_ORG=\$(echo \$INFLUX_SECRET | jq -r '.org')
INFLUX_BUCKET=\$(echo \$INFLUX_SECRET | jq -r '.bucket')
MQTT_HOST=\$(echo \$MQTT_SECRET | jq -r '.host')
MQTT_USER=\$(echo \$MQTT_SECRET | jq -r '.username')
MQTT_PASS=\$(echo \$MQTT_SECRET | jq -r '.password')

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Create docker-compose.yml with secrets from Secrets Manager
cat > docker-compose.yml <<COMPOSE
services:
  influxdb:
    image: influxdb:2.7
    container_name: influxdb
    ports:
      - "127.0.0.1:8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=\${INFLUX_USER}
      - DOCKER_INFLUXDB_INIT_PASSWORD=\${INFLUX_PASS}
      - DOCKER_INFLUXDB_INIT_ORG=\${INFLUX_ORG}
      - DOCKER_INFLUXDB_INIT_BUCKET=\${INFLUX_BUCKET}
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=\${INFLUX_TOKEN}
    volumes:
      - influxdb-data:/var/lib/influxdb2
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8086/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    image: ${ECR_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
    container_name: edgemind-backend
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - AWS_REGION=${REGION}
      - MQTT_HOST=\${MQTT_HOST}
      - MQTT_USERNAME=\${MQTT_USER}
      - MQTT_PASSWORD=\${MQTT_PASS}
      - INFLUXDB_URL=http://influxdb:8086
      - INFLUXDB_TOKEN=\${INFLUX_TOKEN}
      - INFLUXDB_ORG=\${INFLUX_ORG}
      - INFLUXDB_BUCKET=\${INFLUX_BUCKET}
    depends_on:
      influxdb:
        condition: service_healthy
    restart: unless-stopped

volumes:
  influxdb-data:
COMPOSE

# Create .env file with secrets (readable only by root)
cat > .env <<ENVFILE
INFLUX_USER=\${INFLUX_USER}
INFLUX_PASS=\${INFLUX_PASS}
INFLUX_TOKEN=\${INFLUX_TOKEN}
INFLUX_ORG=\${INFLUX_ORG}
INFLUX_BUCKET=\${INFLUX_BUCKET}
MQTT_HOST=\${MQTT_HOST}
MQTT_USER=\${MQTT_USER}
MQTT_PASS=\${MQTT_PASS}
ENVFILE
chmod 600 .env

# Login to ECR
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Start services
docker-compose pull
docker-compose up -d

# Set ownership
chown -R ec2-user:ec2-user /home/ec2-user/app

# Create systemd service for auto-start
cat > /etc/systemd/system/edgemind.service <<'SERVICE'
[Unit]
Description=EdgeMind Factory Dashboard
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
SERVICE

systemctl enable edgemind.service

echo "EdgeMind deployment complete!" > /home/ec2-user/deployment.log
EOF
)

# Create IAM role for EC2
ROLE_NAME="edgemind-ec2-role"
INSTANCE_PROFILE_NAME="edgemind-ec2-profile"

# Check if role exists
if ! aws iam get-role --role-name $ROLE_NAME --profile $AWS_PROFILE &>/dev/null; then
    echo "👤 Creating IAM role..."

    # Create trust policy
    cat > /tmp/trust-policy.json <<'TRUST'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
TRUST

    # Create scoped Bedrock policy (least privilege)
    cat > /tmp/bedrock-policy.json <<BEDROCK
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "BedrockInvokeModel",
            "Effect": "Allow",
            "Action": "bedrock:InvokeModel",
            "Resource": [
                "arn:aws:bedrock:${REGION}::foundation-model/anthropic.claude-*",
                "arn:aws:bedrock:${REGION}::foundation-model/us.anthropic.claude-*"
            ]
        }
    ]
}
BEDROCK

    # Create Secrets Manager access policy (scoped to edgemind secrets)
    cat > /tmp/secrets-policy.json <<SECRETS
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SecretsManagerAccess",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${REGION}:${ECR_ACCOUNT_ID}:secret:edgemind/*"
            ]
        }
    ]
}
SECRETS

    aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file:///tmp/trust-policy.json --profile $AWS_PROFILE

    # Attach ECR read-only (needed to pull images)
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly --profile $AWS_PROFILE

    # Create and attach scoped Bedrock policy
    aws iam put-role-policy --role-name $ROLE_NAME --policy-name BedrockInvokePolicy --policy-document file:///tmp/bedrock-policy.json --profile $AWS_PROFILE

    # Create and attach Secrets Manager policy
    aws iam put-role-policy --role-name $ROLE_NAME --policy-name SecretsManagerPolicy --policy-document file:///tmp/secrets-policy.json --profile $AWS_PROFILE

    # Create instance profile
    aws iam create-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME --profile $AWS_PROFILE
    aws iam add-role-to-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME --role-name $ROLE_NAME --profile $AWS_PROFILE

    # Cleanup temp files
    rm -f /tmp/trust-policy.json /tmp/bedrock-policy.json /tmp/secrets-policy.json

    echo "⏳ Waiting for IAM profile to propagate..."
    sleep 10
fi

# Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --iam-instance-profile Name=$INSTANCE_PROFILE_NAME \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text \
    --profile $AWS_PROFILE \
    --region $REGION)

echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --profile $AWS_PROFILE --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --profile $AWS_PROFILE \
    --region $REGION)

echo ""
echo "✅ EdgeMind deployed successfully!"
echo ""
echo "📍 Instance ID: $INSTANCE_ID"
echo "🌐 Public IP: $PUBLIC_IP"
echo ""
echo "⚠️  IMPORTANT: Update MQTT credentials!"
echo "   Run: ./update-secrets.sh"
echo "   Or update in AWS Console: Secrets Manager > edgemind/mqtt"
echo ""
echo "🔗 Access URLs (wait ~3-5 minutes for startup):"
echo "   Backend API: http://$PUBLIC_IP:3000"
echo "   Health Check: http://$PUBLIC_IP:3000/health"
echo ""
echo "🔒 InfluxDB Access (via SSH tunnel):"
echo "   ssh -L 8086:localhost:8086 -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo "   Then open: http://localhost:8086"
echo ""
echo "🔑 SSH Access:"
echo "   ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
if [ "$SSH_ALLOWED_CIDR" == "0.0.0.0/0" ]; then
    echo "⚠️  SECURITY WARNING: SSH is open to the world!"
    echo "   Restrict access by updating the security group:"
    echo "   aws ec2 revoke-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --profile $AWS_PROFILE --region $REGION"
    echo "   aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr YOUR_IP/32 --profile $AWS_PROFILE --region $REGION"
    echo ""
fi
echo "📋 Check logs:"
echo "   ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP 'docker-compose -f /home/ec2-user/app/docker-compose.yml logs -f'"
