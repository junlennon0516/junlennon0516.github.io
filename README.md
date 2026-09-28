# 장형준 · Infra Operation Portfolio

실무 인프라 운영 경험을 중심으로 구성한 Jekyll 기반 GitHub Pages 포트폴리오입니다. 기존 Plainwhite 테마를 수정했습니다.

## 구성

- `index.md`: 홈 진입점
- `_layouts/home.html`: 실무 운영 → 개발 프로젝트 → 클라우드 실습 순서의 홈
- `_posts/2026-09-28-*.md`: 실무 사례 3편, 클라우드 실습 계획 1편
- `_drafts/development-project-operations.md`: 개발 프로젝트 작성 초안(기본 블로그 빌드에서 제외)
- `about.markdown`: 소개와 기록 원칙
- `_sass/portfolio.scss`: 포트폴리오 스타일

기존 `index.html`, `index.markdown`과 Jekyll 예시 글은 파일을 보존하되 `_config.yml`에서 빌드 제외했습니다. 홈 출력 파일의 중복을 방지하기 위해 새 홈 내용은 `index.md`에서만 관리합니다.

## 글 추가

`_posts/YYYY-MM-DD-slug.md`에 `layout: post`, `title`, `date`, `section`, `order`, `status`, `period`, `excerpt`를 설정합니다. `section`은 `operations`, `projects`, `labs` 중 하나이며 각 홈 섹션에는 `order` 순으로 표시됩니다.

모든 사례는 문제 정의 → 환경과 제약 → 설계 선택 → 구현 → 검증 → 개선점의 여섯 단계로 작성합니다. 계획을 완료 실적으로 바꾸기 전에 실제 결과를 확인하고 개인 담당 범위를 보완합니다. 개발 초안은 실제 프로젝트 근거를 채운 뒤 날짜를 붙여 `_posts`로 이동합니다.

## 로컬 확인

Windows에서 `gem`을 찾을 수 없다는 오류가 나오면 [RubyInstaller](https://rubyinstaller.org/downloads/)의 Ruby+Devkit을 먼저 설치합니다. Ruby 실행 경로(PATH) 등록을 포함하고 설치 후 PowerShell을 새로 엽니다. 필요하면 `ridk install`에서 개발 도구를 구성합니다.

```powershell
ruby -v
gem -v
gem install bundler
```

Ruby와 Bundler가 설치된 환경에서:

```sh
bundle install
bundle exec jekyll serve
```

기본 주소는 `http://localhost:4000`입니다. 초안 확인이 필요한 경우에만 `bundle exec jekyll serve --drafts`를 사용합니다.

## 공개 범위

원본 사내 PDF, CSV 목록, 내부 IP·장비명·계정·폴더명 및 관리 화면은 저장소에 포함하지 않습니다. 공개 글에는 익명화한 설명만 사용합니다. 클라우드 실습은 현재 계획 상태입니다.

## 테마

[Plainwhite](https://github.com/samarsault/plainwhite-jekyll), MIT License. 원본 라이선스는 `LICENSE.txt`에 보존합니다.
