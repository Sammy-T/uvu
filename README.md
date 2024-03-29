# Uvu
This is a chat and conferencing website communicating via WebRTC and using Firebase for signaling.

This project is configured to be deployed using Firebase.

## Getting Started

### Prerequisites
The project must be set up with Firebase and Firebase Tools cli must be installed to interact with emulators, hosting, and the database.

Then, install packages with:
```bash
npm install
```

### Development
Start the dev server:
```bash
npm run dev
```
Then, navigate to http://localhost:5173 to preview the website.

Start the Firebase Emulator dev server:
```bash
npm run dev:firebase
```
Then, navigate to http://localhost:5000 to preview the website.

### Deploying
Build to the `dist` directory and deploy the built files:
```bash
npm run deploy
```

## License
This project uses the [MIT](LICENSE) license.
