# Team Calendar 배포 및 GitHub 연동 가이드

현재 만드신 GitHub 저장소(`belldragon88/team_calendar`)에 코드를 올리고 Vercel로 배포하는 방법입니다.

## 1단계: GitHub 저장소에 코드 올리기 (웹 직접 업로드)

현재 컴퓨터에 Git 프로그램이 설치되어 있지 않기 때문에, 가장 확실하고 쉬운 **웹 브라우저 직접 업로드** 방식을 사용하겠습니다.

1. 웹 브라우저를 열고 생성하신 저장소([https://github.com/belldragon88/team_calendar](https://github.com/belldragon88/team_calendar))에 접속합니다.
2. 화면 중앙이나 'Code' 버튼 쪽에 있는 **"uploading an existing file"** (기존 파일 업로드) 링크를 클릭합니다.
3. 파일 탐색기를 열어 현재 캘린더 코드가 있는 폴더(`C:\Users\LMT_MKT\.gemini\antigravity\scratch\team-calendar`)로 이동합니다.
4. **중요: `node_modules` 폴더는 제외**하고 나머지 모든 파일과 폴더 (특히 `src`, `public`, `package.json`, `vite.config.ts`, `.env.local` 등)를 선택합니다.
5. 선택한 파일들을 브라우저의 "Drag files here to add them to your repository" 영역으로 드래그 앤 드롭합니다.
6. 파일 업로드 게이지가 다 찰 때까지 기다린 후, 하단의 **"Commit changes"** 버튼을 눌러 저장을 완료합니다.

## 2단계: Vercel 계정 생성 및 GitHub 연결

1. [Vercel 회원가입 페이지](https://vercel.com/signup)에 접속합니다.
2. **"Continue with GitHub"**을 클릭하여 방금 코드를 올린 GitHub 계정(`belldragon88`)으로 로그인 및 가입합니다.
3. Vercel이 GitHub 저장소에 접근할 수 있도록 권한을 허용(Authorize Vercel)합니다.

## 3단계: Vercel에서 프로젝트 가져오기 및 환경 변수 설정

1. Vercel 대시보드 화면 우측 상단의 **"Add New..."** 버튼을 누르고 **"Project"**를 선택합니다.
2. 'Import Git Repository' 목록에 방금 만든 `team_calendar` 저장소가 보일 것입니다. 우측의 **"Import"** 버튼을 클릭합니다.
3. **Configure Project** 화면이 나타납니다.
    *   **Framework Preset:** `Vite` 로 자동 설정되어 있는지 확인합니다.
    *   **Environment Variables (중요!):** 이 부분을 펼칩니다.
4. **환경 변수(Environment Variables) 입력하기**
    *   우리가 `.env.local`에 저장했던 Firebase 정보들을 서버에도 알려주어야 합니다.
    *   아래 항목들을 하나씩 복사해서 Name과 Value 칸에 채워넣고 **"Add"** 버튼을 누릅니다.
    *   `VITE_FIREBASE_API_KEY` : `AIzaSyCbKGYcZ1gzehs7bIPTB71MCpRp88W5u9U`
    *   `VITE_FIREBASE_AUTH_DOMAIN` : `teamcalendar-45b0b.firebaseapp.com`
    *   `VITE_FIREBASE_PROJECT_ID` : `teamcalendar-45b0b`
    *   `VITE_FIREBASE_STORAGE_BUCKET` : `teamcalendar-45b0b.firebasestorage.app`
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID` : `805474449903`
    *   `VITE_FIREBASE_APP_ID` : `1:805474449903:web:a00a2a0b06e87e4751de1a`
5. 설정을 마쳤다면 하단의 **"Deploy"** 버튼을 클릭합니다.

## 4단계: 배포 완료 및 접속

- 약 1~2분 정도 기다리면 화려한 폭죽 애니메이션과 함께 배포가 성공적으로 완료됩니다 (Congratulations!).
- **"Continue to Dashboard"** 버튼을 누르거나 생성된 `~~~.vercel.app` 링크를 클릭하면 인터넷상에 배포된 우리 팀 캘린더에 접속해 볼 수 있습니다!
