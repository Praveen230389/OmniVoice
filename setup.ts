import { execSync } from 'child_process';
try {
  console.log("Setting up Python environment...");
  execSync('curl -sS https://bootstrap.pypa.io/get-pip.py -o get-pip.py', { stdio: 'inherit' });
  execSync('python3 get-pip.py --user', { stdio: 'inherit' });
  console.log("Installing omnivoice...");
  execSync('python3 -m pip install --user -e ./OmniVoice', { stdio: 'inherit' });
  console.log("Installing cpu pytorch...");
  execSync('python3 -m pip install --user torch==2.6.0+cpu torchaudio==2.6.0+cpu --extra-index-url https://download.pytorch.org/whl/cpu', { stdio: 'inherit' });
  console.log("Setup complete!");
} catch (e) {
  console.error("Error setting up python:", e);
}
