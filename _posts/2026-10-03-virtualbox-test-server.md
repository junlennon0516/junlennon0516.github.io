---
layout: post
title: "Rocky Linux·VirtualBox 테스트 호스트 구축과 VM 이전 검증"
date: 2026-10-03 18:00:00 +0900
categories: [실무 운영]
tags: [Rocky Linux, VirtualBox, RAID5, XFS, Network, VM, Migration]
section: operations
order: 4
show_tech_stack: true
permalink: /operations/virtualbox-test-server/
excerpt: "RAID5·Rocky Linux 기반 테스트 호스트를 구축하고 VM 1대를 이전했습니다. 기존 설정·Snapshot을 유지하며 부팅, 브리지 네트워크, SSH와 서비스 상태를 이전 전후 비교했습니다."
---

운영 가상화 환경을 정비하기 전에 사용할 **VirtualBox 테스트 서버를 구축**했습니다. 물리 서버의 저장소와 OS를 구성한 뒤 VM 1대를 이전해 네트워크와 서비스 상태까지 사전 검증한 사례입니다.

| 구성 | 핵심 내용 |
| --- | --- |
| 운영체제 | Rocky Linux 8.10 · x86_64 · UEFI |
| 저장소 | 물리 디스크 4개 · RAID5 · 약 835GB |
| 파일시스템 | XFS · 부팅 영역과 Swap 별도 구성 |
| 가상화 도구 | VirtualBox · 작업 기록상 7.2.16 |
| 접근 환경 | 고정 IP · SSH · XRDP 설치 |

<style>
.vbox-evidence { margin: 1.5rem 0 2rem; }
.vbox-evidence img { display: block; max-width: 100%; max-height: 520px; width: auto; height: auto; margin: 0 auto; border-radius: 8px; }
.vbox-evidence figcaption { margin-top: .7rem; font-size: .9em; line-height: 1.7; }
</style>

## 구축 목적

기존 가상화 호스트의 환경을 변경하기에 앞서 별도 테스트 환경을 마련했습니다. 테스트 호스트 구축과 VM 1대 이전 검증까지 수행했으며, 전체 운영 VM 이관과 기존 호스트 업데이트는 후속 범위입니다.

## 저장소와 OS 구성

RAID 컨트롤러와 디스크 상태를 확인한 뒤 기존 구성을 제거하고, 디스크 4개로 RAID5와 Virtual Disk를 새로 구성했습니다. 약 835GB의 가상 디스크와 컨트롤러의 `Optimal` 상태를 확인했습니다.


<figure class="vbox-evidence"><a href="{{ '/assets/projects/virtualbox-test-server/rocky-image.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/virtualbox-test-server/rocky-image.png' | relative_url }}" alt="설치 이미지 준비: Rocky Linux 8.10 DVD ISO를 선택했습니다." loading="lazy" /></a><figcaption>설치 이미지 준비: Rocky Linux 8.10 DVD ISO를 선택했습니다.</figcaption></figure>

UEFI 방식으로 Rocky Linux를 설치하고, 부팅 영역·Swap·루트 영역을 나누었습니다. 루트 파일시스템은 XFS로 구성해 OS와 프로그램, 향후 VM 데이터를 저장하도록 준비했습니다.

RAID5는 디스크 장애에 대비하는 구성이며, VM 데이터의 별도 백업은 추가로 준비해야 할 운영 항목입니다.

## 네트워크와 가상화 환경 준비

고정 IP, Gateway, DNS와 Hostname을 설정하고 SSH 접속을 확인했습니다. 디스크가 의도대로 인식되는지도 점검한 뒤, 원격 GUI 접근을 위한 XRDP와 VirtualBox를 설치했습니다.


<figure class="vbox-evidence"><a href="{{ '/assets/projects/virtualbox-test-server/os-network.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/virtualbox-test-server/os-network.png' | relative_url }}" alt="OS·네트워크 확인: hostnamectl과 ifconfig로 Rocky Linux, x86_64 아키텍처와 인터페이스 상태를 확인했습니다." loading="lazy" /></a><figcaption>OS·네트워크 확인: hostnamectl과 ifconfig로 Rocky Linux, x86_64 아키텍처와 인터페이스 상태를 확인했습니다.</figcaption></figure>


<figure class="vbox-evidence"><a href="{{ '/assets/projects/virtualbox-test-server/ssh-session.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/virtualbox-test-server/ssh-session.png' | relative_url }}" alt="원격 접속 확인: SSH 로그인과 세션 종료 기록입니다." loading="lazy" /></a><figcaption>원격 접속 확인: SSH 로그인과 세션 종료 기록입니다.</figcaption></figure>

VirtualBox 설치를 위한 컴파일 도구와 커널 개발 패키지를 준비했습니다.

<figure class="vbox-evidence"><a href="{{ '/assets/projects/virtualbox-test-server/build-dependencies.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/virtualbox-test-server/build-dependencies.png' | relative_url }}" alt="설치 의존성 준비: gcc, make, perl, kernel-devel, kernel-headers 등의 패키지 설치 명령과 목록입니다. 이 화면은 설치 완료 결과가 아닌 패키지 준비 과정입니다." loading="lazy" /></a><figcaption>설치 의존성 준비: gcc, make, perl, kernel-devel, kernel-headers 등의 패키지 설치 명령과 목록입니다. 이 화면은 설치 완료 결과가 아닌 패키지 준비 과정입니다.</figcaption></figure>

VirtualBox는 실행 화면과 버전 출력을 확인했습니다. Extension Pack은 라이선스 검토 후 적용 여부를 결정하는 항목으로 남겼습니다.


<figure class="vbox-evidence"><a href="{{ '/assets/projects/virtualbox-test-server/virtualbox-manager.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/virtualbox-test-server/virtualbox-manager.png' | relative_url }}" alt="VirtualBox 관리자 실행 확인: 설치 후 GUI가 열리는 것을 확인했습니다. 이 화면에는 등록된 VM이 없어 VM 실행 검증과는 구분합니다." loading="lazy" /></a><figcaption>VirtualBox 관리자 실행 확인: 설치 후 GUI가 열리는 것을 확인했습니다. 이 화면에는 등록된 VM이 없어 VM 실행 검증과는 구분합니다.</figcaption></figure>

작업 기록에는 테스트 환경 설정 과정에서 SELinux와 방화벽을 비활성화한 내용이 있습니다. 운영 전환 시에는 필요한 접근 규칙과 SELinux 정책을 정리해 적용하는 작업이 필요합니다.

## 확인 결과

| 확인 항목 | 기록된 결과 |
| --- | --- |
| RAID 구성 | RAID5 Virtual Disk 용량 및 `Optimal` 상태 확인 |
| OS | 설치 완료 후 Rocky Linux 정상 부팅 |
| 네트워크 | 고정 IP·Gateway·DNS 설정과 SSH 접속 확인 |
| 저장소 | OS에서 할당 디스크 인식 확인 |
| VirtualBox | 프로그램 정상 실행 및 버전 확인 |

호스트 구축 단계에서는 OS와 가상화 도구 실행을 확인했습니다. 이후 수행한 VM 이전 검증 결과는 아래에 정리했습니다. 호스트 재부팅 후 VM 동작은 제공된 기록에 포함되지 않았습니다.

## 보안 점검과 후속 과제

구축 후 「주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세가이드」를 기준으로 취약점 점검을 진행했습니다. 제공된 기록에는 항목별 판정과 조치 결과가 없어 점검 통과나 취약점 해소 성과로 표현하지 않았습니다.

운영 이관 전에는 보안 설정, 백업·원복 조건과 VM별 저장 경로를 정리해야 합니다.

## VM 1대 이전으로 운영 이관 사전 검증

전체 VM을 이전하기 전에 스테이징 VM 1대를 테스트 호스트로 옮겨 새 환경에서의 동작을 확인했습니다. 운영 호스트와 임시 호스트의 자원을 조사한 뒤, 작은 범위의 이전으로 호환성과 서비스 상태를 먼저 검증하는 순서였습니다.

VM을 종료하고 OVA 백업을 생성한 다음 VM 디렉터리 전체를 테스트 호스트로 복사했습니다. 기존 VM 설정과 Snapshot 구조를 유지해 VirtualBox에 등록하고, Extension Pack을 설치하지 않은 상태로 기동했습니다.

| 검증 항목 | 작업 기록에서 확인한 결과 |
| --- | --- |
| VM 부팅 | 새 테스트 호스트에서 정상 기동 |
| 설정·Snapshot | 기존 설정과 Snapshot 구조 유지하여 등록 |
| 네트워크 | 기존 IP 및 Bridged Network 정상 동작 |
| 원격 접근 | SSH 정상 접속 |
| 서비스 상태 | Java 버전과 Apache·Tomcat 프로세스 상태를 이전 전후 비교해 동일 상태 확인 |

테스트 VM 1대는 새 환경에서 부팅·네트워크·SSH 및 기존 서비스 상태를 확인했습니다. 이 결과는 전체 운영 VM의 이관 완료나 사용자 요청 전체에 대한 서비스 검증을 의미하지 않습니다.

## 전체 VM 이관을 위한 다음 단계

테스트 결과를 바탕으로 VM별 자원과 서비스 영향을 확인하고, **VM 종료·백업 → 순차 이관 → 부팅·네트워크·서비스 점검 → 기존 호스트 정비** 순서로 진행할 계획입니다. VM을 종료해 이전하는 방식이므로 서비스 중단을 고려해야 합니다.

기존 호스트를 초기화하기 전에는 이관한 VM의 정상 동작과 별도 백업을 확인해야 합니다. 전체 VM 이관 및 기존 호스트 업데이트의 실행 결과는 작업 기록이 추가되면 이어서 정리합니다.
