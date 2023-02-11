# Pearrd
This is a chat and conferencing website communicating via WebRTC and using Firebase for signaling. It's built using [Hugo-ing](https://github.com/Sammy-T/hugo-ing).

This project is configured to be tested and deployed using Firebase.

## Getting Started

### Prerequisites
The project must be set up with Firebase and Firebase Tools cli must be installed to interact with emulators, hosting, and the database.

Then, install packages with:
```bash
npm install
```

### Development
Start the Firebase Emulator dev server:
```bash
npm run dev
```
Then, navigate to http://localhost:5000 to preview the website. The browser window must be refreshed to display content changes when running the Firebase Emulator.  

### Deploying
Build to the `dist` directory and deploy the built files:
```bash
npm run deploy
```

## License
This project uses the [MIT](LICENSE) license.
