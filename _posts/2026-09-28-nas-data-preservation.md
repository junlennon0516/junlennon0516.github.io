---
layout: post
title: "NAS 데이터 보존·이관으로 여유 공간 570GB → 9.3TB 확보"
date: 2026-09-28 09:10:00 +0900
categories: [실무 운영]
tags: [Storage, NAS, Backup, CSV, rsync, SSH]
section: operations
show_tech_stack: true
order: 2
period: 2026.08 작업 기록
permalink: /operations/nas-data-preservation/
excerpt: "운영·백업 NAS의 파일 목록을 비교해 보존할 폴더 8개를 선정했습니다. 별도 NAS로 이관하고 정리해 백업 NAS의 여유 공간을 569.8GB에서 9.3TB로 확보했습니다."
---

백업 NAS의 공간 부족을 해결하기 위해 운영 NAS와 파일 목록을 비교하고, **보존할 데이터를 별도 NAS로 이관한 뒤 정리**했습니다. 작업 후 여유 공간은 **569.8GB에서 9.3TB**로 늘었습니다.

| 핵심 결과 | 내용 |
| --- | --- |
| 분석 범위 | 운영 NAS 약 439만 개·백업 NAS 약 510만 개 파일 |
| 보존 대상 | 백업 NAS에만 남아 있는 폴더 중 8개 선정 |
| 처리 방식 | 별도 NAS로 이관·확인 후 원래 저장소 정리 |
| 여유 공간 | 569.8GB → 9.3TB |

<style>
.nas-evidence { margin: 1.5rem 0; }
.nas-evidence img { display: block; max-width: 100%; height: auto; border-radius: 8px; }
.nas-evidence figcaption { margin-top: .6rem; font-size: .9em; line-height: 1.7; }
</style>

## 문제: 공간은 부족하지만 바로 삭제할 수 없는 데이터

임직원 운영 NAS를 백업하는 장비의 저장공간이 부족했습니다. 백업 NAS에는 운영 NAS보다 약 71만 개의 파일이 더 있었고, 과거 업무자료가 남아 있는 폴더도 확인됐습니다.

반면 일부 공통 폴더는 백업 NAS의 파일 수가 더 적었습니다. 전체 파일 수와 용량만으로 삭제 대상을 정하거나 백업이 완전하다고 판단하기 어려워, 공유폴더와 파일 단위로 차이를 확인했습니다.


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/backup-before.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/backup-before.png' | relative_url }}" alt="작업 전 백업 NAS(109): 사용률 98%, 사용량 23.8TB와 여유 공간 622.2GB가 표시됩니다. 아래 작업 기록의 569.8GB와는 측정 시점이 다른 현황입니다." loading="lazy" /></a><figcaption>작업 전 백업 NAS(109): 사용률 98%, 사용량 23.8TB와 여유 공간 622.2GB가 표시됩니다. 아래 작업 기록의 569.8GB와는 측정 시점이 다른 현황입니다.</figcaption></figure>


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/operating-storage.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/operating-storage.png' | relative_url }}" alt="비교 대상 운영 NAS(110): 사용량 17.8TB, 여유 공간 6.5TB입니다. 두 NAS의 사용량 차이를 확인한 화면입니다." loading="lazy" /></a><figcaption>비교 대상 운영 NAS(110): 사용량 17.8TB, 여유 공간 6.5TB입니다. 두 NAS의 사용량 차이를 확인한 화면입니다.</figcaption></figure>

## 1. CSV 목록으로 두 NAS의 데이터 비교

두 NAS의 공유폴더별 파일 목록을 같은 형식의 CSV로 추출했습니다. 수백만 개 파일을 비교할 수 있도록 NAS별·공유폴더별로 목록을 나누고, 저장공간 사용 원인을 확인하기 위해 시스템 파일도 포함했습니다.

| 비교 기준 | 확인 목적 |
| --- | --- |
| 공유폴더·상대경로·파일명 | 두 NAS에서 대응되는 파일과 한쪽에만 있는 파일 구분 |
| 파일 크기 | 용량 차이와 저장공간 사용 현황 확인 |
| 수정일 | 같은 경로의 파일이 서로 다르게 갱신됐는지 확인 |

비교 결과는 한쪽에만 있는 파일, 크기·수정일이 다른 파일, 한쪽에만 존재하는 공유폴더로 분류했습니다. 경로·크기·수정일이 같다는 것은 메타데이터 기준의 일치이며, 파일 내용의 해시까지 비교한 결과는 아닙니다.

## 2. 보존할 폴더 선정과 이관 장비 준비

백업 NAS에만 존재하는 9개 폴더의 사용량은 약 9.65TB였습니다. 보존이 불필요한 폴더 1개를 제외하고 **8개 폴더를 보존 대상으로 선정**했습니다.

전산실의 유휴 장비를 조사해 4TB 디스크 4개가 장착된 DS918+를 이관 장비로 선정하고 세팅했습니다. 보존용 장비는 아래 과정을 거쳐 RAID5·Btrfs 저장소로 구성했습니다.

### 유휴 DS918+를 보존용 NAS로 구성

디스크 4개 중 2개에서 시스템 파티션 실패를 확인했습니다. S.M.A.R.T. 빠른 테스트에서는 4개 모두 정상으로 확인돼, 시스템 파티션 복구를 진행하고 정상 상태를 확인했습니다.

<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/partition-before.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/partition-before.png' | relative_url }}" alt="복구 전: 드라이브 1·2에서 시스템 파티션 실패가 표시됐습니다." loading="lazy" /></a><figcaption>복구 전: 드라이브 1·2에서 시스템 파티션 실패가 표시됐습니다.</figcaption></figure>


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/partition-after.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/partition-after.png' | relative_url }}" alt="복구 후: 드라이브 4개가 모두 정상 상태로 표시됐습니다." loading="lazy" /></a><figcaption>복구 후: 드라이브 4개가 모두 정상 상태로 표시됐습니다.</figcaption></figure>

기존 자료의 사용 여부와 데이터 통합 당시 삭제 공지를 확인한 뒤 초기화했습니다. DSM 재설치와 관리자·고정 IP 설정을 마치고, **4TB HDD 4개로 RAID5 스토리지 풀과 Btrfs 볼륨**을 구성했습니다.

보존용 공유폴더에는 데이터 체크섬을 활성화하고 관리자 접근 권한을 설정했습니다. 스토리지 풀 용량은 10.9TB, 이관 전 볼륨의 여유 공간은 **10.5TB**로 확인했습니다. RAID5는 디스크 1개 장애에 대비하는 구성이며 별도 백업을 대체하지 않습니다.

<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/raid5-pool.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/raid5-pool.png' | relative_url }}" alt="RAID5 구성 결과: 스토리지 풀 10.9TB와 드라이브 4개의 정상 상태를 확인했습니다." loading="lazy" /></a><figcaption>RAID5 구성 결과: 스토리지 풀 10.9TB와 드라이브 4개의 정상 상태를 확인했습니다.</figcaption></figure>


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/archive-capacity.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/archive-capacity.png' | relative_url }}" alt="이관 전 보존용 볼륨: 여유 공간 10.5TB를 확인해 보존 데이터를 받을 저장소를 준비했습니다." loading="lazy" /></a><figcaption>이관 전 보존용 볼륨: 여유 공간 10.5TB를 확인해 보존 데이터를 받을 저장소를 준비했습니다.</figcaption></figure>

## 3. 전용 연결로 데이터 이관과 예외 처리

원본 NAS와 보존용 NAS의 별도 LAN 포트를 직접 연결하고, 이관용 IP를 할당해 공유폴더 동기화를 진행했습니다. 용량이 작은 폴더부터 복제해 완료 여부를 확인하는 순서로 작업했습니다.


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/source-lan.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/source-lan.png' | relative_url }}" alt="원본 NAS의 이관용 LAN 포트 3 설정입니다. 캡처 시점에는 연결 해제로 표시돼 있으며 전송 중 연결 상태를 증명하는 화면은 아닙니다." loading="lazy" /></a><figcaption>원본 NAS의 이관용 LAN 포트 3 설정입니다. 캡처 시점에는 연결 해제로 표시돼 있으며 전송 중 연결 상태를 증명하는 화면은 아닙니다.</figcaption></figure>


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/destination-lan.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/destination-lan.png' | relative_url }}" alt="보존용 NAS의 이관용 LAN 포트 2 설정입니다. 두 포트에 별도 주소를 할당해 이관 경로를 준비했습니다." loading="lazy" /></a><figcaption>보존용 NAS의 이관용 LAN 포트 2 설정입니다. 두 포트에 별도 주소를 할당해 이관 경로를 준비했습니다.</figcaption></figure>

동기화 과정에서 일부 휴지통 파일이 복제되지 않는 예외가 있었습니다. 해당 파일은 SSH를 통해 별도로 복제하고, 보존 대상 8개 폴더의 이전 완료 여부를 확인했습니다.


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/rsync-transfer.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/rsync-transfer.png' | relative_url }}" alt="SSH·rsync를 통한 별도 복제 기록입니다. 홈 디렉터리 경고가 표시되지만 하단에는 파일 전송 진행이 확인됩니다. 전체 폴더 이관 완료는 이 화면만으로 판단하지 않습니다." loading="lazy" /></a><figcaption>SSH·rsync를 통한 별도 복제 기록입니다. 홈 디렉터리 경고가 표시되지만 하단에는 파일 전송 진행이 확인됩니다. 전체 폴더 이관 완료는 이 화면만으로 판단하지 않습니다.</figcaption></figure>

**보존 대상 선정 → 별도 장비 이관 → 이전 확인 → 원래 저장소 정리** 순서를 지켜, 공간 확보 전에 보존할 데이터의 이동을 마쳤습니다.

## 결과: 데이터 보존 후 여유 공간 9.3TB 확보

보존 데이터 이관과 검증을 마친 뒤 원래 백업 NAS의 정리 대상 데이터를 삭제했습니다. 작업 기록의 저장공간 표시값은 다음과 같습니다.

| 지표 | 작업 전 | 작업 후 |
| --- | ---: | ---: |
| 사용량 | 23.8TB | 15TB |
| 여유 공간 | 569.8GB | 9.3TB |


<figure class="nas-evidence"><a href="{{ '/assets/projects/nas-data-preservation/storage-after.png' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/projects/nas-data-preservation/storage-after.png' | relative_url }}" alt="정리 후 백업 NAS(109): 사용량 15TB, 여유 공간 9.3TB로 저장공간 확보 결과를 확인했습니다." loading="lazy" /></a><figcaption>정리 후 백업 NAS(109): 사용량 15TB, 여유 공간 9.3TB로 저장공간 확보 결과를 확인했습니다.</figcaption></figure>

분석 중 확인한 9.65TB는 백업 NAS에만 있던 9개 폴더의 사용량입니다. 실제 확보한 공간과는 다른 값이므로 별도로 구분했습니다. 이관 완료 확인은 기록돼 있지만, 파일 해시 대조나 상세 검증 명령은 제공된 자료에 포함되지 않았습니다.

## 운영 관점에서 배운 점

스토리지 정리에서는 용량보다 먼저 **데이터를 남겨야 하는 이유와 삭제 가능한 범위**를 확인해야 했습니다. 운영 NAS에 없다는 이유만으로 과거 자료를 삭제할 수 없었고, 백업 NAS의 파일 수가 더 많다는 이유만으로 백업 상태가 정상이라고 볼 수도 없었습니다.

후속 개선으로는 비교 기준 시각을 고정하고, 이관 전후 파일 수·용량과 복제 예외를 기록하는 방식을 정리할 수 있습니다. 중요 데이터에는 해시 또는 표본 검증을 추가하고, 보존 기간과 삭제 승인 기준을 문서화할 필요가 있습니다.
