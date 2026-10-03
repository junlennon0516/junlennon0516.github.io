---
layout: post
title: "Overlay GPT: 문서 작업을 연결하는 Windows AI 도우미 UI 개발"
date: 2026-10-03 12:00:00 +0900
categories: [개발 프로젝트]
tags: [Vue.js, Figma, SignalR, .NET, Windows]
show_tech_stack: true
section: projects
order: 1
permalink: /projects/overlay-gpt/
excerpt: "Office·한글 문서 작업과 AI를 연결하는 Windows 애플리케이션 팀 프로젝트입니다. Vue.js 프론트엔드, 반응형 상태 관리와 .NET 백엔드의 SignalR 통신 연동을 담당했습니다."
---

문서 편집기와 AI 서비스 사이의 **복사 → 검색 → 붙여넣기**로 끊기는 작업 흐름을 줄이기 위한 Windows 애플리케이션 프로젝트입니다. MS Office와 한글 형식의 문서를 AI와 연결하는 환경을 목표로 5인 팀이 개발했습니다.

[GitHub 저장소 보기](https://github.com/DoonillaLatte/overlay-gpt-vue)

## 담당 역할

**Vue.js 프론트엔드 개발과 실시간 통신 연동**을 담당했습니다.

| 담당 영역 | 구현 내용 |
| --- | --- |
| UI/UX | Figma를 활용한 화면 설계와 프로토타이핑 |
| 상태 관리 | Vue Composable로 상태 관리 로직 구성 |
| 동적 UI | ref 기반 반응형 시스템으로 화면 상태 갱신 |
| 백엔드 연동 | SignalR을 이용한 .NET 백엔드와 실시간 양방향 통신 연결·관리 |

## 서비스 구조와 구현 범위

Vue.js 사용자 화면을 .NET 백엔드·메인 컨트롤러와 연결하는 구조입니다. 팀 자료에서는 AI·Embedding API를 위한 Flask 계층과 문서·애플리케이션 연동을 포함한 전체 구성을 제시했습니다.

저는 프론트엔드에서 사용자 상태를 관리하고, 백엔드와의 실시간 통신을 화면에 연결하는 부분에 집중했습니다. 문서 접근과 AI 처리 전반은 팀 프로젝트 범위이며 개인 구현 범위와 구분합니다.

## 개발에서 다룬 핵심

화면 상태 관리 로직을 Composable로 분리하고, 반응형 UI와 SignalR 통신을 연결하는 경험을 쌓았습니다. 사용자 화면과 백엔드 처리 사이의 상태 전달을 다룬 프로젝트로, UI 설계부터 서비스 연동까지 참여했습니다.

문맥 기반 문장 개선, 참고 자료 검색·삽입과 파일 형식 변환은 발표 자료의 활용·확장 방향입니다. 제공된 자료에 정량 성능이나 작업 시간 개선 수치는 없어 수치 성과로 기재하지 않았습니다.
