#!/bin/bash
# Sync knowledge-base folder to Bedrock KB and trigger ingestion
set -e

CDK_STACK_PREFIX="${CDK_STACK_PREFIX:-edgemind-prod}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KB_PATH="${SCRIPT_DIR}/../knowledge-base"
STACK_NAME="${CDK_STACK_PREFIX}-knowledgebase"

echo "=== Syncing Knowledge Base ==="

# Get stack outputs
BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='DocumentsBucketName'].OutputValue" --output text)
KB_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='KnowledgeBaseId'].OutputValue" --output text)
DS_ID=$(aws bedrock-agent list-data-sources --knowledge-base-id $KB_ID --region "$REGION" \
  --query "dataSourceSummaries[0].dataSourceId" --output text)

echo "Bucket: $BUCKET"
echo "KB ID: $KB_ID"
echo "Data Source: $DS_ID"

# Upload documents and images (Bedrock KB supports PNG/JPEG up to 3.75MB with multimodal embeddings)
echo -e "\n--- Uploading documents ---"
aws s3 sync "$KB_PATH" "s3://$BUCKET/"

# Start ingestion
echo -e "\n--- Starting ingestion job ---"
JOB=$(aws bedrock-agent start-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID --region "$REGION")
JOB_ID=$(echo $JOB | jq -r '.ingestionJob.ingestionJobId')
echo "Ingestion job started: $JOB_ID"

# Wait for completion
echo "Waiting for ingestion to complete..."
while true; do
  STATUS=$(aws bedrock-agent get-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID \
    --ingestion-job-id $JOB_ID --region "$REGION" --query 'ingestionJob.status' --output text)
  echo "  Status: $STATUS"
  [[ "$STATUS" == "COMPLETE" || "$STATUS" == "FAILED" ]] && break
  sleep 5
done

echo -e "\n=== Done ==="
