# OpenAI Codex CLI Authentication in MorphBox

This guide explains how to authenticate OpenAI's Codex CLI within MorphBox's Docker container environment.

## The Challenge

OpenAI Codex CLI uses OAuth authentication with a callback to `http://localhost:1455/auth/callback`. In MorphBox's Docker container environment, this poses a challenge because:

1. The container runs in an isolated network
2. Your browser can't directly access `localhost:1455` inside the container
3. Traditional OAuth flows expect direct browser access

## Supported Authentication Methods

### Method 1: UI Upload (Recommended - Easiest)

Upload your auth.json file directly through the MorphBox Settings panel.

**Prerequisites:**
- Codex CLI installed on your local machine
- Browser access on local machine

**Steps:**

1. **On your local machine**, authenticate with Codex:
   ```bash
   codex login
   ```

2. Complete the browser authentication flow

3. **In MorphBox**, open the Settings panel (Ctrl+,) and go to the **Security** tab

4. Scroll to the **OpenAI Codex CLI Authentication** section

5. Click **📁 Upload auth.json**

6. Select your auth.json file from:
   - Mac/Linux: `~/.codex/auth.json`
   - Windows: `%USERPROFILE%\.codex\auth.json`

7. Wait for confirmation - the file will be automatically transferred to the container!

**Pros:**
- Easiest method - all done through the UI
- No command line needed after initial authentication
- Works from anywhere (local or remote MorphBox)
- Automatic setup and validation
- Instant feedback on success/failure

**Cons:**
- Requires browser access for initial Codex login on local machine

---

### Method 2: API Key Authentication (Simplest for Direct Setup)

Use an OpenAI API key directly inside the container.

**Prerequisites:**
- OpenAI API key with access to the Responses API

**Steps:**

1. Launch a terminal in MorphBox (Terminal panel or Coex panel)

2. Run the login command with API key:
   ```bash
   codex login --with-api-key
   ```

3. When prompted, enter your OpenAI API key

**Pros:**
- No localhost callback issues
- Works perfectly in Docker/headless environments
- One-command setup
- No file transfers needed

**Cons:**
- Requires OpenAI API key (separate from ChatGPT subscription)
- API usage is charged separately

---

### Method 3: Manual Auth.json Transfer (Advanced)

Authenticate on your local machine, then manually transfer credentials to the container via command line.

**Prerequisites:**
- Codex CLI installed on your local machine
- Browser access on local machine
- SSH access to your VPS (if using remote MorphBox)

**Steps:**

1. **On your local machine**, install and authenticate Codex:
   ```bash
   npm install -g @openai/codex-cli
   codex login
   ```

2. Complete the browser authentication flow

3. **Locate your auth.json file:**
   - Mac/Linux: `~/.codex/auth.json`
   - Windows: `%USERPROFILE%\.codex\auth.json`

4. **Copy auth.json to MorphBox:**

   **Option A: If MorphBox is running locally:**
   ```bash
   # Copy to MorphBox scripts directory
   cp ~/.codex/auth.json /home/kruger/projects/morphbox/web/scripts/codex-auth.json

   # Run the setup script (see below)
   cd /home/kruger/projects/morphbox/web
   ./scripts/codex-setup-auth.sh
   ```

   **Option B: If MorphBox is on a remote VPS:**
   ```bash
   # Copy to VPS
   scp ~/.codex/auth.json user@your-vps:/home/kruger/projects/morphbox/web/scripts/codex-auth.json

   # SSH to VPS and run setup script
   ssh user@your-vps
   cd /home/kruger/projects/morphbox/web
   ./scripts/codex-setup-auth.sh
   ```

5. The setup script will copy the auth.json into the container

**Pros:**
- One-time setup
- Works with ChatGPT subscriptions (no separate API key needed)
- No ongoing port forwarding required
- Simple file transfer

**Cons:**
- Requires local machine with browser for initial auth
- Need to manually transfer file (can be scripted)

---

### Method 4: SSH Port Forwarding (Advanced)

For direct authentication from inside the Docker container using port forwarding.

**Prerequisites:**
- SSH access to your VPS
- Understanding of SSH port forwarding
- Patience with multi-layer networking

**Architecture:**
```
Local Browser → SSH Tunnel → VPS Host → Docker Container → Codex CLI
                 (port 1455)
```

**Steps:**

1. **From your local machine, create SSH tunnel to VPS:**
   ```bash
   ssh -L 1455:localhost:1455 user@your-vps
   ```
   Keep this terminal open!

2. **On the VPS, forward port from container to host:**
   ```bash
   # Expose container port 1455 to host
   docker exec -it morphbox-vm bash -c "socat TCP-LISTEN:1455,fork TCP:host.docker.internal:1455 &"
   ```

3. **Inside the container, run Codex login:**
   ```bash
   docker exec -it morphbox-vm bash
   codex login
   ```

4. Complete authentication in your local browser

5. The OAuth callback will flow through: `Browser → Local:1455 → SSH → VPS:1455 → Container:1455`

**Pros:**
- Can authenticate directly from container
- No file transfers

**Cons:**
- Complex setup with multiple steps
- Requires maintaining tunnel during auth
- Fragile - easy to break
- Hard to troubleshoot

---

## Using the Helper Script

MorphBox includes a helper script to simplify auth.json transfer:

```bash
cd /home/kruger/projects/morphbox/web
./scripts/codex-setup-auth.sh
```

The script will:
1. Check if `scripts/codex-auth.json` exists
2. Verify the Docker container is running
3. Create `.codex` directory in the container
4. Copy `auth.json` into the container
5. Set proper permissions
6. Verify authentication works

---

## Verifying Authentication

After setting up authentication, verify it works:

1. Open a terminal in MorphBox (Terminal or Coex panel)

2. Run a simple Codex command:
   ```bash
   codex chat "Hello, what is 2+2?"
   ```

3. If authenticated correctly, you should get a response from Codex

---

## Troubleshooting

### "Error: Not authenticated"

- Verify auth.json exists in container: `docker exec morphbox-vm ls -la ~/.codex/`
- Check file permissions: `docker exec morphbox-vm cat ~/.codex/auth.json`
- Try re-running the setup script

### "Connection refused" during OAuth

- Ensure SSH tunnel is active (for Method 3)
- Check port 1455 is not already in use: `lsof -i :1455`
- Verify container networking is working

### "Invalid API key"

- If using API key method, verify the key is correct
- Check key has access to Responses API
- Try generating a new API key

### Auth.json file format issues

The auth.json should look like:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890
}
```

If the format is wrong, re-authenticate on your local machine.

---

## Security Considerations

### API Keys
- Never commit API keys to git
- Use environment variables when possible
- Rotate keys regularly

### Auth.json
- Contains sensitive OAuth tokens
- Don't share or commit to version control
- Tokens expire and need refresh

### Container Security
- Auth credentials are isolated within the container
- Container destruction removes credentials
- Re-authentication required after container rebuild

---

## Additional Resources

- [OpenAI Codex CLI Documentation](https://github.com/openai/codex)
- [OpenAI Codex Authentication Guide](https://github.com/openai/codex/blob/main/docs/authentication.md)
- [MorphBox Docker Setup](./DOCKER_SETUP.md)

---

## Quick Start Summary

**Easiest method (UI upload with ChatGPT subscription):**
1. On local machine: `codex login`
2. In MorphBox: Open Settings (Ctrl+,) → Security tab
3. Click **📁 Upload auth.json**
4. Select `~/.codex/auth.json` from your local machine
5. Done! ✅

**Fastest method (if you have API key):**
```bash
# Inside MorphBox terminal
codex login --with-api-key
```

**Manual method (command line):**
```bash
# On local machine
codex login
cp ~/.codex/auth.json /path/to/morphbox/web/scripts/codex-auth.json

# On MorphBox
cd /home/kruger/projects/morphbox/web
./scripts/codex-setup-auth.sh
```
