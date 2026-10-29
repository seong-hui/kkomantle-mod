# kkomantle

Claude Code 안에서 [꼬맨틀](https://semantle-ko.newsjel.ly)(한국어 단어 유사도 추측 게임)을 하는 mod 다. `/kkom` 명령과 사이드 패널을 등록한다.

## 설치

Claude Code 프롬프트에서:

```
/plugin install kkomantle --marketplace seong-hui/kkomantle-mod
```

셸에서:

```
claude plugin install kkomantle --marketplace seong-hui/kkomantle-mod
```

데스크톱 앱에서는 입력창 옆 + 를 누르고 Plugins 에서 Add marketplace 에 `seong-hui/kkomantle-mod` 를 넣은 뒤 Add plugin 을 누른다.

`Add marketplace?` 에 `y`, 범위는 user 를 고르면 바로 켜진다.

## 사용

```
/kkom          패널을 연다
/kkom <단어>    단어를 추측하고 유사도와 순위를 보여 준다
```

패널에는 오늘 퍼즐의 1위·10위·1000위 유사도와, 지금까지 추측한 단어가 유사도 순으로 나온다. 입력창이 있는 화면에서는 패널에서 바로 Enter 로 추측한다.

퍼즐 번호는 자정에 바뀌고, 추측 기록은 퍼즐 번호별로 플러그인 저장소에 남는다. 점수는 꼬맨틀 사이트의 `/today`, `/guess` 응답을 그대로 쓴다.

## 테스트

```
claude plugin test .
```
