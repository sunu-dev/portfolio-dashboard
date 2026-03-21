#!/bin/bash
# ============================================
# 포트폴리오 대시보드 - 원클릭 재배포
# 대시보드 업데이트 후 이 스크립트를 실행하세요
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export NETLIFY_AUTH_TOKEN="nfp_3y3eqw6kfwArpCin3iz6HCj9aoqDJEdQab19"

echo "📊 포트폴리오 대시보드 재배포 중..."

# HTML 복사
mkdir -p "$SCRIPT_DIR/deploy-site"
cp "$SCRIPT_DIR/포트폴리오_대시보드.html" "$SCRIPT_DIR/deploy-site/index.html"

# 배포
cd "$SCRIPT_DIR/deploy-site"
netlify deploy --dir=. --prod

echo ""
echo "✅ 배포 완료! 상대방은 같은 URL에서 최신 버전을 확인할 수 있습니다."
