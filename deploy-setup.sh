#!/bin/bash
# ============================================
# 포트폴리오 대시보드 - Netlify 자동 배포 세팅
# 최초 1회만 실행하면 됩니다
# ============================================

echo "🚀 포트폴리오 대시보드 Netlify 배포 설정을 시작합니다..."
echo ""

# 1. Netlify CLI 설치
echo "📦 Netlify CLI 설치 중..."
npm install -g netlify-cli
echo ""

# 2. 토큰 설정
echo "🔑 Netlify 인증 토큰 설정 중..."
export NETLIFY_AUTH_TOKEN="nfp_3y3eqw6kfwArpCin3iz6HCj9aoqDJEdQab19"
echo ""

# 3. 사이트 생성 + 첫 배포
echo "🌐 새 Netlify 사이트 생성 및 배포 중..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# deploy-site 폴더 생성
mkdir -p "$SCRIPT_DIR/deploy-site"
cp "$SCRIPT_DIR/포트폴리오_대시보드.html" "$SCRIPT_DIR/deploy-site/index.html"

# 사이트 생성 + 배포
cd "$SCRIPT_DIR/deploy-site"
netlify deploy --dir=. --prod --site-name=sunu-portfolio-dashboard

echo ""
echo "✅ 배포 완료! 위에 표시된 URL을 상대방에게 공유하세요."
echo ""
echo "💡 이후 업데이트 시에는 deploy.sh 를 실행하면 됩니다."
