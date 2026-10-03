---
layout: post
title: "전원 장애 후 Linux 서버·Docker 서비스·NAS 복구"
date: 2026-09-28 09:00:00 +0900
categories: [실무 운영]
tags: [Linux, Docker, NAS, Storage, Troubleshooting, Network]
section: operations
show_tech_stack: true
order: 1
period: 2026.08.18
permalink: /operations/power-outage-recovery/
excerpt: "전원 복구 후 접속되지 않던 서버를 전원·링크·네트워크·컨테이너 순서로 점검했습니다. 물리 서버 3대를 조치하고 웹서비스와 NAS 3대의 정상 접속을 확인했습니다."
---

<style>
.incident-evidence { margin: 1.5rem 0 2rem; }
.incident-evidence img { display: block; max-width: 100%; max-height: 520px; width: auto; height: auto; margin: 0 auto; border-radius: 8px; }
.incident-evidence figcaption { margin-top: .7rem; font-size: .9em; line-height: 1.7; }
</style>

전산실 전원 복구 후 일부 서버와 NAS가 자동으로 정상화되지 않았습니다. 장비별로 **전원, LAN 링크, Linux 인터페이스, Docker 컨테이너 상태**를 확인하고, 복구 후 실제 서비스 접속까지 점검한 사례입니다.

| 대상 | 확인·조치 결과 |
| --- | --- |
| 물리 서버 3대 | LAN 링크, 전원 상태, 네트워크 인터페이스 확인 및 조치 |
| Docker 기반 내부 웹서비스 | 중지된 Redis·서비스 컨테이너 기동 후 정상 접속 확인 |
| NAS 3대 | 수동 기동 후 정상 접속 확인 |

## 장애 상황과 점검 순서

건물 전기 작업 중 차단기를 내려 전산실 전체 전원이 차단됐습니다. 전원이 다시 공급되자 대부분의 장비는 자동 기동됐지만, 일부 서버는 Ping·SSH에 응답하지 않았고 NAS 3대는 꺼진 상태였습니다. 전원 복구 이후 추가 차단 이력도 확인돼 현장 점검이 필요했습니다.

점검은 **전원 → 물리 링크 → 네트워크 → 컨테이너 → 서비스 접속** 순서로 진행했습니다. 같은 ‘접속 불가’ 증상이라도 장비마다 확인해야 할 지점이 달랐기 때문입니다.

## 1. 원격 접속이 안 되는 서버: 전원과 LAN 링크 확인

가상화 호스트는 Ping·SSH에 응답하지 않았고, 후면 LAN 포트의 Link LED가 꺼져 있었습니다. 케이블을 다른 포트에 연결해 링크가 올라오는지 확인한 뒤 기존 포트에 다시 연결했습니다. 이후 기존 포트의 Link LED가 정상화됐습니다.

<figure class="incident-evidence"><a href="{{ '/assets/projects/power-outage-recovery/lan-link.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/power-outage-recovery/lan-link.png' | relative_url }}" alt="서버 후면 LAN 포트와 Link LED" loading="lazy" /></a><figcaption>LAN 연결과 Link LED를 확인한 현장 사진입니다. 케이블 재연결 후 기존 포트의 링크 정상화는 작업 기록으로 확인했습니다.</figcaption></figure>

API 서버도 Ping·SSH에 응답하지 않았지만, 현장에서는 전원 상태 LED가 빨간색으로 표시됐습니다. 서버를 종료한 뒤 재기동했고, 전원 상태 LED가 파란색으로 바뀐 것을 확인했습니다.

<figure class="incident-evidence"><a href="{{ '/assets/projects/power-outage-recovery/server-power.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/power-outage-recovery/server-power.png' | relative_url }}" alt="재기동 후 서버 전원 상태 LED" loading="lazy" /></a><figcaption>재기동 후 전원 상태 LED를 확인한 사진입니다. LAN 링크 문제와 전원 상태 문제를 각각 나누어 조치했습니다.</figcaption></figure>

## 2. DB 서버: 미사용 네트워크 인터페이스 정리

DB 서버는 기존에 `eno2`를 사용하고 있었지만, 재부팅 과정에서 물리적으로 연결되지 않은 `eno1`도 활성화됐습니다. 미사용 인터페이스인 `eno1`을 비활성화하고, 실제 사용하는 `eno2`의 연결 상태를 확인했습니다.

<figure class="incident-evidence"><a href="{{ '/assets/projects/power-outage-recovery/network-interface.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/power-outage-recovery/network-interface.png' | relative_url }}" alt="eno1 비활성화 및 eno2 연결 상태" loading="lazy" /></a><figcaption>조치 후 eno1은 꺼짐, eno2는 켜짐·1000 Mb/s 연결 상태로 표시됩니다. 상세 라우팅 원인이나 영구 설정 변경까지 검증한 기록은 없습니다.</figcaption></figure>

## 3. SSH는 되지만 웹서비스가 안 열리는 서버: 컨테이너 복구

내부 웹서비스 서버는 SSH 접속이 정상이었지만 웹페이지는 열리지 않았습니다. `docker ps -a`로 확인한 결과 Redis와 웹서비스 컨테이너는 `Exited`, MariaDB는 실행 중이었습니다. 호스트 접속과 애플리케이션 상태를 별도로 확인해야 하는 상황이었습니다.

<figure class="incident-evidence"><a href="{{ '/assets/projects/power-outage-recovery/containers-before.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/power-outage-recovery/containers-before.png' | relative_url }}" alt="복구 전 Docker 컨테이너 상태" loading="lazy" /></a><figcaption>Redis와 웹서비스 컨테이너는 Exited (255), MariaDB는 Up 상태였습니다. 종료 코드는 관찰한 상태이며, 이 화면만으로 종료 원인을 단정할 수는 없습니다.</figcaption></figure>

Redis 컨테이너를 먼저 기동하고, 이어 웹서비스 컨테이너를 기동했습니다. 두 컨테이너가 `Up` 상태로 바뀐 뒤 서비스 포트와 웹페이지 접속을 확인했습니다.

<figure class="incident-evidence"><a href="{{ '/assets/projects/power-outage-recovery/containers-after.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/power-outage-recovery/containers-after.png' | relative_url }}" alt="Redis 및 웹서비스 컨테이너 기동 후 상태" loading="lazy" /></a><figcaption>Redis를 먼저 기동하고 웹서비스를 기동한 뒤 모두 Up 상태로 확인했습니다. 웹페이지 정상 접속은 작업 기록에 남아 있으며, 이번 첨부 자료에는 접속 화면이 포함되지 않았습니다.</figcaption></figure>

## 4. 전원이 꺼진 NAS: 수동 기동과 접속 확인

현장에서 NAS 3대가 전원 OFF 상태인 것을 확인했습니다. 각 장비를 수동으로 기동하고, 기동 완료 후 접속 상태를 확인했습니다.

## 복구 결과와 배운 점

작업 기록상 접속 불가 물리 서버 3대의 상태 확인과 조치를 완료했습니다. 중지된 컨테이너를 기동한 뒤 내부 웹서비스가 정상 접속됐고, NAS 3대도 수동 기동 후 접속을 확인했습니다. 전산실 서버·네트워크 장비의 정상 동작도 확인했습니다.

이 사례에서 중요했던 점은 **복구 완료의 기준을 실제 서비스 접속까지 잡는 것**이었습니다. 전원이 켜져 있거나 SSH가 된다는 사실만으로 사용자가 이용하는 서비스까지 정상이라고 판단할 수 없었습니다.

다음 전원 작업에 대비해 장비 영향 범위를 사전에 공유하고, 서버·NAS의 자동 기동 정책, 재부팅 후 네트워크 설정, 컨테이너 자동 시작 정책을 점검할 필요가 있습니다. 이 항목들은 후속 개선 과제이며 이번에 적용 완료한 조치는 아닙니다.

*사내 장애 조치 기록을 바탕으로 정리했습니다. 서비스별 중단·복구 시간은 별도로 계측되지 않아 시간 단축 성과로 표현하지 않았습니다.*
