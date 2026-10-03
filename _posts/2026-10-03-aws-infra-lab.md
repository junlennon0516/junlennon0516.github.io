---
layout: post
title: "AWS EC2·Docker Compose로 API 배포, 컨테이너 복구·DB 데이터 보존 검증"
date: 2026-10-03 16:00:00 +0900
categories: [클라우드 실습]
tags: [AWS, EC2, Linux, FastAPI, Docker]
section: labs
order: 0
status: Part 1~4 완료
period: 2026.09.28 ~ 2026.10.03
permalink: /projects/aws-infra-lab/
excerpt: "EC2에 FastAPI를 배포하고 컨테이너 중지·재시작에 따른 응답 변화를 확인했습니다. Compose로 API·PostgreSQL을 구성해 재생성 전후 동일한 데이터 3건이 유지됨을 검증했습니다."
---

<p>AWS EC2에 Linux 서버를 구성하고, FastAPI 애플리케이션을 Docker 이미지로 패키징해 실행한 인프라 실습 프로젝트입니다. 현재 <strong>Part 1~4까지 진행</strong>했으며, 서버 구성, 컨테이너 수동 복구, Compose 기반 API·DB 구성과 데이터 영속성 검증까지 다룹니다.</p>

<style>
.aws-evidence { margin: 1.5rem 0; }
.aws-evidence img { display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid #697386; }
.aws-evidence figcaption { margin-top: .6rem; font-size: .9em; line-height: 1.7; }
</style>

<p><strong>기술 스택</strong> · AWS EC2 · Ubuntu · Linux · Python · FastAPI · Docker</p>

<h2 id="프로젝트-목표">프로젝트 목표</h2>

<p>클라우드 서버에서 애플리케이션을 실행하는 과정을 익히고, 서버와 컨테이너의 실행 상태를 실제 API 응답과 함께 확인합니다. 접근 범위를 제한하고 실행 환경을 이미지로 관리하는 데 초점을 두었습니다.</p>

<h2 id="구성">구성</h2>

<figure class="aws-evidence">
  <a href="{{ '/assets/projects/aws-infra-lab/architecture.png' | relative_url }}" target="_blank" rel="noopener">
    <img src="{{ '/assets/projects/aws-infra-lab/architecture.png' | relative_url }}" alt="AWS 기본 VPC의 EC2에서 Docker Compose로 FastAPI, PostgreSQL과 pgdata 볼륨을 구성한 아키텍처" loading="eager" />
  </a>
  <figcaption>Part 4 기준 전체 구성입니다. 실제 OS는 Ubuntu이며, API는 EC2의 <code>127.0.0.1:8080</code>에 연결했습니다. 그림의 로컬 PC → API 화살표는 요청 흐름을 나타내며 인터넷에서 8080번 포트로 직접 접근하는 구성은 아닙니다. 로컬 PC에서 접근하려면 SSH 터널이 필요합니다.</figcaption>
</figure>


<div class="language-text highlighter-rouge"><div class="highlight"><pre class="highlight"><code>Mac → SSH (22 / 내 공인 IP만 허용) → AWS EC2
                                      └─ Ubuntu Server
                                          └─ Docker 컨테이너
                                              └─ FastAPI :8000
EC2 내부 요청 → 127.0.0.1:8000 → 컨테이너 :8000
</code></pre></div></div>

<p>이번 실습은 기본 VPC의 퍼블릭 서브넷에 EC2 한 대를 구성하는 방식입니다. 퍼블릭·프라이빗 서브넷을 분리하는 다중 계층 아키텍처는 이번 범위에 포함하지 않았습니다.</p>

<h2 id="part-1-aws-ec2와-linux-서버-구축">Part 1. AWS EC2와 Linux 서버 구축</h2>

<table>
  <thead>
    <tr>
      <th>항목</th>
      <th>실습 구성</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>리전</td>
      <td>서울 · ap-northeast-2</td>
    </tr>
    <tr>
      <td>운영체제</td>
      <td>Ubuntu Server 24.04 LTS · x86_64</td>
    </tr>
    <tr>
      <td>인스턴스</td>
      <td>t3.medium · 2 vCPU / 4 GiB RAM</td>
    </tr>
    <tr>
      <td>스토리지</td>
      <td>20 GiB · gp3</td>
    </tr>
    <tr>
      <td>네트워크</td>
      <td>기본 VPC의 퍼블릭 서브넷</td>
    </tr>
    <tr>
      <td>인바운드 접근</td>
      <td>SSH 22 · 내 공인 IP /32</td>
    </tr>
  </tbody>
</table>

<p>비용 관리와 접근 제어를 서버 구축의 일부로 다뤘습니다. 실습 예산과 알림을 설정하고, 실습 종료 시 인스턴스를 중지하는 운영 원칙을 정리했습니다. 예산 알림과 자동 중지는 별개이며, 인스턴스를 중지해도 스토리지 등 별도 비용이 남을 수 있다는 점을 구분했습니다.</p>

<p>SSH 키는 로컬에서 제한된 권한으로 보관하고 저장소에 포함하지 않도록 했습니다. 보안 그룹은 SSH 접근을 내 IP로 제한하는 구성이며, 애플리케이션 포트를 인터넷에 공개하지 않습니다.</p>

<p>서버 접속 후에는 다음 항목으로 실행 환경과 자원 상태를 점검했습니다.</p>

<table>
  <thead>
    <tr>
      <th>점검 명령</th>
      <th>확인 목적</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">hostnamectl</code>, <code class="language-plaintext highlighter-rouge">uname -a</code></td>
      <td>OS·커널·아키텍처 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">free -h</code></td>
      <td>메모리 사용량 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">df -h</code></td>
      <td>디스크 용량과 사용량 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">ip -br addr</code></td>
      <td>네트워크 인터페이스와 IP 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">uptime</code></td>
      <td>가동 시간과 Load Average 확인</td>
    </tr>
  </tbody>
</table>

<h3 id="ec2-구성-확인">EC2 구성 확인</h3>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/ec2-overview.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/ec2-overview.png" alt="EC2 인스턴스 실행 상태" loading="lazy" />
  </a>
  <figcaption><strong>EC2 인스턴스 실행 상태</strong> — infra-lab-ec2가 실행 중이며, 인스턴스 유형은 t3.medium입니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/ubuntu-ami.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/ubuntu-ami.png" alt="Ubuntu AMI 확인" loading="lazy" />
  </a>
  <figcaption><strong>Ubuntu AMI 확인</strong> — Ubuntu 24.04 amd64 서버 이미지를 사용했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/security-group.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/security-group.png" alt="SSH 접근 범위 제한" loading="lazy" />
  </a>
  <figcaption><strong>SSH 접근 범위 제한</strong> — 인바운드는 TCP 22번 포트와 단일 공인 IP의 /32 범위로 제한했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/ebs-volume.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/ebs-volume.png" alt="EBS 스토리지 구성" loading="lazy" />
  </a>
  <figcaption><strong>EBS 스토리지 구성</strong> — gp3 유형의 20 GiB 볼륨을 확인했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/ssh-login.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/ssh-login.png" alt="Mac에서 SSH 접속" loading="lazy" />
  </a>
  <figcaption><strong>Mac에서 SSH 접속</strong> — SSH 접속 후 Ubuntu 24.04.4 LTS 로그인 메시지를 확인했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/linux-checks.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/linux-checks.png" alt="Linux 서버 자원 점검" loading="lazy" />
  </a>
  <figcaption><strong>Linux 서버 자원 점검</strong> — hostnamectl과 uname으로 OS·커널을 확인했습니다. 캡처 시점의 메모리는 총 3.7 GiB, 루트 파일시스템은 19 GiB이며 사용률은 10%였습니다.</figcaption>
</figure>

<h2 id="part-2-fastapi-상태-확인-api">Part 2. FastAPI 상태 확인 API</h2>

<p>컨테이너화 전에 Python 가상환경에서 API를 직접 실행하고, 루프백 주소로 요청해 애플리케이션의 동작을 확인하는 단계입니다.</p>

<table>
  <thead>
    <tr>
      <th>경로</th>
      <th>역할</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">/</code></td>
      <td>서비스 이름과 실행 상태 반환</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">/identity</code></td>
      <td>응답한 실행 환경의 호스트명 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">/health/live</code></td>
      <td>프로세스 생존 상태 확인</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">/health/ready</code></td>
      <td>요청 처리 준비 상태 확인</td>
    </tr>
  </tbody>
</table>

<p>Liveness와 Readiness를 분리해, 프로세스의 생존 여부와 요청을 처리할 준비 상태를 서로 다른 관점에서 확인하도록 설계했습니다. 장애 플래그 파일을 이용한 상태 변경은 후속 장애 검증을 위한 구성입니다.</p>

<div class="language-bash highlighter-rouge"><div class="highlight"><pre class="highlight"><code>uvicorn app.main:app <span class="nt">--host</span> 127.0.0.1 <span class="nt">--port</span> 8000
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready
</code></pre></div></div>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/api-health.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/api-health.png" alt="기본 API와 Health Check 응답" loading="lazy" />
  </a>
  <figcaption><strong>기본 API와 Health Check 응답</strong> — 기본 경로는 running, /health/live는 alive, /health/ready는 ready 상태를 반환했습니다.</figcaption>
</figure>

<p><code class="language-plaintext highlighter-rouge">/notes</code>의 DB 저장·조회 기능은 Part 4의 Compose 단계에서 검증했습니다. Part 2에서는 기본 응답과 상태 확인 API에 집중했습니다.</p>

<h2 id="part-3-docker-환경-구축과-컨테이너-운영">Part 3. Docker 환경 구축과 컨테이너 운영</h2>

<p>Docker 공식 APT 저장소를 사용하는 설치 절차를 적용하고, 서비스 상태와 Engine·Compose 플러그인 버전을 점검하는 단계입니다. <code class="language-plaintext highlighter-rouge">hello-world</code>는 컨테이너 실행 환경을 확인하는 데 사용했습니다. Compose 기반 서비스 구성은 Part 4에서 다룹니다.</p>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/docker-service.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/docker-service.png" alt="Docker 서비스 실행 상태" loading="lazy" />
  </a>
  <figcaption><strong>Docker 서비스 실행 상태</strong> — systemctl에서 active (running) 상태를 확인했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/hello-world.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/hello-world.png" alt="hello-world 실행 검증" loading="lazy" />
  </a>
  <figcaption><strong>hello-world 실행 검증</strong> — 이미지 다운로드 후 Hello from Docker! 메시지로 컨테이너 실행을 확인했습니다.</figcaption>
</figure>

<h3 id="실행-환경을-이미지로-패키징">실행 환경을 이미지로 패키징</h3>

<p>Python 3.12 slim 이미지를 기반으로 의존성과 애플리케이션을 패키징하고, 별도 사용자로 API를 실행하도록 구성했습니다.</p>

<div class="language-dockerfile highlighter-rouge"><div class="highlight"><pre class="highlight"><code><span class="k">FROM</span><span class="s"> python:3.12-slim</span>
<span class="k">WORKDIR</span><span class="s"> /app</span>
<span class="k">ENV</span><span class="s"> PYTHONDONTWRITEBYTECODE=1</span>
<span class="k">ENV</span><span class="s"> PYTHONUNBUFFERED=1</span>
<span class="k">COPY</span><span class="s"> requirements.txt .</span>
<span class="k">RUN </span>pip <span class="nb">install</span> <span class="nt">--no-cache-dir</span> <span class="nt">-r</span> requirements.txt
<span class="k">RUN </span>useradd <span class="nt">--system</span> <span class="nt">--uid</span> 10001 <span class="nt">--create-home</span> appuser
<span class="k">COPY</span><span class="s"> app ./app</span>
<span class="k">USER</span><span class="s"> appuser</span>
<span class="k">EXPOSE</span><span class="s"> 8000</span>
<span class="k">CMD</span><span class="s"> ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]</span>
</code></pre></div></div>

<p><code class="language-plaintext highlighter-rouge">.dockerignore</code>와 <code class="language-plaintext highlighter-rouge">.gitignore</code>를 각각 구성해 환경 변수 파일, SSH 키, 가상환경 등이 이미지나 저장소에 들어가지 않도록 관리했습니다. <code class="language-plaintext highlighter-rouge">EXPOSE</code>는 포트 문서화 용도이고, 실제 포트 연결은 실행 시 지정합니다.</p>

<div class="language-bash highlighter-rouge"><div class="highlight"><pre class="highlight"><code><span class="nb">sudo </span>docker build <span class="nt">-t</span> infra-lab-api:1.0 <span class="nb">.</span>
<span class="nb">sudo </span>docker run <span class="nt">-d</span> <span class="nt">--name</span> infra-api-test <span class="se">\</span>
  <span class="nt">-p</span> 127.0.0.1:8000:8000 infra-lab-api:1.0
</code></pre></div></div>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/image-build.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/image-build.png" alt="API 이미지 빌드 완료" loading="lazy" />
  </a>
  <figcaption><strong>API 이미지 빌드 완료</strong> — python:3.12-slim 기반 빌드가 FINISHED로 완료되고 infra-lab-api:1.0 태그가 생성됐습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/image-list.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/image-list.png" alt="빌드 이미지 목록" loading="lazy" />
  </a>
  <figcaption><strong>빌드 이미지 목록</strong> — docker images에서 infra-lab-api:1.0 이미지가 등록된 것을 확인했습니다.</figcaption>
</figure>

<p>호스트의 루프백 주소에만 포트를 연결하는 구성으로, EC2 내부에서 API에 접근합니다.</p>

<h3 id="실행-상태와-서비스-응답을-함께-확인">실행 상태와 서비스 응답을 함께 확인</h3>

<table>
  <thead>
    <tr>
      <th>확인 방법</th>
      <th>확인 목적</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">docker ps</code></td>
      <td>컨테이너 프로세스 실행 상태</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">curl</code></td>
      <td>실제 API 요청에 대한 응답</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">docker logs</code></td>
      <td>애플리케이션 로그와 오류</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">docker stats --no-stream</code></td>
      <td>CPU·메모리 등 자원 사용량</td>
    </tr>
  </tbody>
</table>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/container-response.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/container-response.png" alt="컨테이너 실행·API 응답·로그 확인" loading="lazy" />
  </a>
  <figcaption><strong>컨테이너 실행·API 응답·로그 확인</strong> — 컨테이너의 Up 상태, 127.0.0.1:8000 포트 연결, running 응답과 HTTP 200 OK 로그를 확인했습니다.</figcaption>
</figure>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/container-stats.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/container-stats.png" alt="컨테이너 자원 사용량" loading="lazy" />
  </a>
  <figcaption><strong>컨테이너 자원 사용량</strong> — 캡처 시점의 CPU 사용률은 0.16%, 메모리 사용량은 38.98 MiB였습니다. 단일 시점의 관찰 값이며 부하 테스트 결과는 아닙니다.</figcaption>
</figure>

<p>컨테이너를 중지한 뒤 요청 실패를 확인하고, 다시 시작해 상태 확인 API의 응답을 점검하는 수동 복구 실습을 다뤘습니다. 자동 재시작 정책이나 자동 복구 구성은 이번 단계에 포함하지 않았습니다.</p>

<div class="language-bash highlighter-rouge"><div class="highlight"><pre class="highlight"><code><span class="nb">sudo </span>docker stop infra-api-test
curl http://127.0.0.1:8000/
<span class="nb">sudo </span>docker start infra-api-test
curl http://127.0.0.1:8000/health/live
</code></pre></div></div>

<figure class="aws-evidence">
  <a href="/assets/projects/aws-infra-lab/container-recovery.png" target="_blank" rel="noopener">
    <img src="/assets/projects/aws-infra-lab/container-recovery.png" alt="컨테이너 중지와 수동 복구" loading="lazy" />
  </a>
  <figcaption><strong>컨테이너 중지와 수동 복구</strong> — 중지 후 curl 연결 실패를 확인하고, docker start 이후 /health/live가 alive를 반환하는 것을 확인했습니다. 실습 종료 후 테스트 컨테이너를 삭제했습니다.</figcaption>
</figure>

<h2 id="part-4-compose-api-db">Part 4. Docker Compose로 API·DB 구성과 데이터 영속성 검증</h2>
<p>단일 API 컨테이너에서 확장해 FastAPI와 PostgreSQL 16을 별도 서비스로 구성했습니다. 핵심 검증은 API를 통한 DB 저장·조회와, 컨테이너를 삭제하고 재생성한 뒤에도 같은 데이터가 남아 있는지 확인하는 것이었습니다.</p>
<h3>서비스 통신과 저장소 설계</h3>
<pre><code>EC2 내부 요청 → 127.0.0.1:8080 → API :8000
                                  │ Compose 내부 네트워크
                                  └→ db:5432 → PostgreSQL 16
                                                └→ Named Volume: pgdata
</code></pre>
<p>API만 호스트의 루프백 주소 <code>127.0.0.1:8080</code>에 연결하고, PostgreSQL은 호스트에 포트를 게시하지 않았습니다. API는 Compose 내부 네트워크의 서비스 이름 <code>db</code>로 DB에 연결하도록 구성했습니다.</p>
<p>DB 접속 정보는 <code>.env</code>에서 관리하고, 저장소에는 실제 비밀번호 대신 <code>.env.example</code>만 포함하는 방식으로 구성했습니다. DB의 데이터 디렉터리 <code>/var/lib/postgresql/data</code>는 Named Volume <code>pgdata</code>에 연결했습니다.</p>
<h3>서비스 준비 상태를 고려한 배포</h3>
<p>DB에는 <code>pg_isready</code>, API에는 <code>/health/ready</code>를 사용하는 Health Check를 정의했습니다. <code>depends_on: condition: service_healthy</code>로 DB의 Health Check가 통과한 뒤 API를 시작하도록 구성하고, 두 서비스에 <code>restart: unless-stopped</code>를 설정했습니다. 재시작 정책과 Health Check는 각각 실행 유지와 상태 확인을 위한 설정입니다.</p>
<pre><code>sudo docker compose up -d --build
curl http://127.0.0.1:8080/health/ready
</code></pre>
<figure class="aws-evidence"><a href="{{ '/assets/projects/aws-infra-lab/compose-ready.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/aws-infra-lab/compose-ready.png' | relative_url }}" alt="Compose API의 준비 상태 확인" loading="lazy" /></a><figcaption><strong>Compose API의 준비 상태 확인</strong> — 8080번 포트의 /health/ready 요청에서 status: ready 응답을 확인했습니다.</figcaption></figure>
<figure class="aws-evidence"><a href="{{ '/assets/projects/aws-infra-lab/compose-docker-status.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/aws-infra-lab/compose-docker-status.png' | relative_url }}" alt="Docker Engine 실행 상태" loading="lazy" /></a><figcaption><strong>Docker Engine 실행 상태</strong> — Docker 서비스는 active (running) 상태였습니다. 하단 로그에는 healthcheck failed 기록도 보이지만 메시지가 잘려 있어 이 캡처만으로 원인이나 해당 컨테이너를 특정할 수 없습니다. 최종 준비 상태는 API 응답과 아래 재생성 결과로 확인했습니다.</figcaption></figure>
<h3>데이터 영속성 검증</h3>
<p>테스트 메시지를 저장한 뒤 조회하고, <code>docker compose down</code>으로 컨테이너와 네트워크를 제거했습니다. 이때 볼륨을 삭제하는 <code>-v</code> 옵션은 사용하지 않았습니다. 남아 있는 볼륨을 확인한 후 서비스를 재생성해 동일한 데이터를 다시 조회했습니다.</p>
<pre><code>curl -X POST http://127.0.0.1:8080/notes \
  -H "Content-Type: application/json" \
  -d '{"message":"persist-test"}'
curl http://127.0.0.1:8080/notes
sudo docker compose down
sudo docker volume ls
sudo docker compose up -d
curl http://127.0.0.1:8080/notes
</code></pre>
<figure class="aws-evidence"><a href="{{ '/assets/projects/aws-infra-lab/notes-before.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/aws-infra-lab/notes-before.png' | relative_url }}" alt="① 데이터 저장 후 최초 조회" loading="lazy" /></a><figcaption><strong>① 데이터 저장 후 최초 조회</strong> — persist-test 메시지가 id 1, 2, 3의 세 레코드로 조회됐습니다. 캡처에 기록된 실제 조회 결과를 비교 기준으로 사용했습니다.</figcaption></figure>
<figure class="aws-evidence"><a href="{{ '/assets/projects/aws-infra-lab/compose-volume-retained.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/aws-infra-lab/compose-volume-retained.png' | relative_url }}" alt="② 컨테이너 삭제 후 볼륨 보존" loading="lazy" /></a><figcaption><strong>② 컨테이너 삭제 후 볼륨 보존</strong> — API·DB 컨테이너와 기본 네트워크는 Removed로 표시됐지만, docker volume ls에는 infra-lab_pgdata 볼륨이 남아 있었습니다.</figcaption></figure>
<figure class="aws-evidence"><a href="{{ '/assets/projects/aws-infra-lab/notes-after.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/aws-infra-lab/notes-after.png' | relative_url }}" alt="③ 서비스 재생성 후 동일 데이터 조회" loading="lazy" /></a><figcaption><strong>③ 서비스 재생성 후 동일 데이터 조회</strong> — DB가 Healthy, API가 Started로 표시된 뒤 /notes를 조회했습니다. 재생성 전과 같은 id 1, 2, 3 및 persist-test 메시지 세 건이 유지됐습니다.</figcaption></figure>
<h3>검증 결과와 운영 관점</h3>
<p>컨테이너·네트워크를 제거한 뒤에도 Named Volume이 유지됐고, 재생성한 PostgreSQL에서 API를 통해 동일한 데이터를 조회했습니다. 이 결과로 컨테이너의 생명주기와 DB 데이터 저장소를 분리한 구성을 확인했습니다.</p>
<p>이번 검증은 같은 EC2와 같은 볼륨을 유지한 상태에서의 데이터 보존 실험입니다. 볼륨 삭제나 호스트 장애에 대한 백업·복구 검증은 별도 과제입니다. 다음 Kubernetes 단계에서는 상태를 저장하지 않는 API를 대상으로 Pod 상태 검사와 복구를 확인할 예정입니다.</p>

<h2 id="학습한-운영-관점">학습한 운영 관점</h2>

<ul>
  <li>서버 접근 권한과 애플리케이션 포트 공개 범위를 따로 관리합니다.</li>
  <li>컨테이너가 실행 중인지와 서비스가 실제로 응답하는지를 함께 점검합니다.</li>
  <li>이미지 빌드 단계와 컨테이너 실행 단계를 구분합니다.</li>
  <li>비용 관리, 자원 점검, 로그 확인을 배포 과정에 포함합니다.</li>
</ul>

<h2 id="검증-자료">검증 자료</h2>

<p>실습 과정에서 기록한 캡처 19장을 각 단계에 첨부했습니다. 이미지를 클릭하면 원본 크기로 확인할 수 있습니다.</p>

<p>EC2 구성, Linux 자원 점검, API 정상 응답, Docker 실행과 이미지 빌드, 컨테이너의 수동 복구와 Compose 재생성 전후의 DB 데이터 보존을 캡처로 확인했습니다. 예산 설정 화면, Docker·Compose 버전 출력, <code class="language-plaintext highlighter-rouge">/identity</code> 응답은 이번 자료에 포함되지 않았습니다.</p>

<h2 id="후속-단계">후속 단계</h2>

<p>k3s 기반 Kubernetes 배포·Probe 장애 검증으로 확장할 예정입니다. 현재 포트폴리오의 진행 범위는 Part 4까지입니다.</p>
