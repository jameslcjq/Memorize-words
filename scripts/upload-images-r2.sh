#!/bin/bash

# 批量上传 public/images/words/ 下的图片到 Cloudflare R2
#
# 前置条件:
#   1. 安装 wrangler: npm i -g wrangler
#   2. 登录: wrangler login
#   3. 创建存储桶: wrangler r2 bucket create word-images
#
# 用法:
#   bash scripts/upload-images-r2.sh

BUCKET_NAME="word-images"
IMAGES_DIR="$(dirname "$0")/../public/images/words"

if [ ! -d "$IMAGES_DIR" ]; then
  echo "❌ 图片目录不存在: $IMAGES_DIR"
  echo "请先运行 node scripts/fetch-word-images.js 下载图片"
  exit 1
fi

count=0
failed=0

for file in "$IMAGES_DIR"/*.jpg "$IMAGES_DIR"/*.png "$IMAGES_DIR"/*.webp; do
  [ -f "$file" ] || continue

  filename=$(basename "$file")
  echo "⬆ 上传: $filename"

  if wrangler r2 object put "${BUCKET_NAME}/${filename}" --file "$file" --content-type "image/jpeg" 2>/dev/null; then
    count=$((count + 1))
  else
    echo "❌ 上传失败: $filename"
    failed=$((failed + 1))
  fi
done

echo ""
echo "--- 完成 ---"
echo "成功上传: $count 张"
echo "失败: $failed 张"

if [ $count -gt 0 ]; then
  echo ""
  echo "提示: 请确保 R2 存储桶已配置公开访问或自定义域名"
  echo "然后用 R2_PUBLIC_URL 环境变量重新运行 fetch-word-images.js 更新 JSON 中的图片 URL"
fi
