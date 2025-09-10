import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../config';
import crypto from 'crypto';

export class DockerBuilder {
  private configManager: ConfigManager;
  private imageName: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    const configHash = this.getConfigHash();
    this.imageName = `morphbox:${configHash}`;
  }

  private getConfigHash(): string {
    const config = this.configManager.getConfig();
    const configString = JSON.stringify(config);
    return crypto.createHash('md5').update(configString).digest('hex').substring(0, 8);
  }

  async buildImage(): Promise<string> {
    // Check if image already exists
    const imageExists = await this.checkImageExists();
    if (imageExists) {
      console.log(`Image ${this.imageName} already exists, skipping build`);
      return this.imageName;
    }

    console.log(`Building Docker image ${this.imageName}...`);
    
    // Generate Dockerfile from config
    const dockerfileContent = this.generateDockerfile();
    
    // Create a temporary directory for the build context
    const tempDir = path.join('/tmp', `morphbox-build-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Write the Dockerfile
    const dockerfilePath = path.join(tempDir, 'Dockerfile');
    fs.writeFileSync(dockerfilePath, dockerfileContent);
    
    // Build the image
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('docker', ['build', '-t', this.imageName, tempDir], {
        stdio: 'inherit'
      });

      buildProcess.on('close', (code) => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        if (code === 0) {
          console.log(`Successfully built image ${this.imageName}`);
          resolve(this.imageName);
        } else {
          reject(new Error(`Docker build failed with code ${code}`));
        }
      });

      buildProcess.on('error', (err) => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        reject(err);
      });
    });
  }

  private async checkImageExists(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkProcess = spawn('docker', ['image', 'inspect', this.imageName], {
        stdio: 'pipe'
      });

      checkProcess.on('close', (code) => {
        resolve(code === 0);
      });

      checkProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  private generateDockerfile(): string {
    const packages = this.configManager.getPackages();
    const nodeVersion = this.configManager.getConfig().development?.runtimes?.node;
    const pythonVersion = this.configManager.getConfig().development?.runtimes?.python;
    const goVersion = this.configManager.getConfig().development?.runtimes?.go;
    const npmPackages = this.configManager.getConfig().development?.npm_packages || [];
    const pipPackages = this.configManager.getConfig().development?.pip_packages || [];
    const goPackages = this.configManager.getConfig().development?.go_packages || [];
    const shell = this.configManager.getShell();
    const env = this.configManager.getEnvironment();
    const ports = this.configManager.getAdditionalPorts();

    let dockerfile = `FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

RUN apt-get update && apt-get install -y \\
    sudo \\
    curl \\
    wget \\
    git \\
    build-essential \\
    software-properties-common \\
    ca-certificates \\
    gnupg \\
    lsb-release \\
    openssh-server`;

    if (packages.length > 0) {
      dockerfile += ` \\\n    ${packages.join(' \\\n    ')}`;
    }

    dockerfile += ` && \\
    apt-get clean && \\
    rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -s ${shell} -u 1000 morphbox && \\
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Configure SSH
RUN mkdir /var/run/sshd && \\
    echo 'morphbox:morphbox' | chpasswd && \\
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \\
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config`;

    // Add Node.js if specified
    if (nodeVersion) {
      dockerfile += `

# Install Node.js ${nodeVersion}
RUN curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash - && \\
    apt-get install -y nodejs`;

      if (npmPackages.length > 0) {
        dockerfile += ` && \\
    npm install -g ${npmPackages.join(' ')}`;
      }
    }

    // Add Python if specified
    if (pythonVersion) {
      dockerfile += `

# Install Python ${pythonVersion}
RUN add-apt-repository ppa:deadsnakes/ppa && \\
    apt-get update && \\
    apt-get install -y python${pythonVersion} python${pythonVersion}-pip python${pythonVersion}-venv && \\
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${pythonVersion} 1`;

      if (pipPackages.length > 0) {
        dockerfile += ` && \\
    python${pythonVersion} -m pip install ${pipPackages.join(' ')}`;
      }
    }

    // Add Go if specified
    if (goVersion) {
      dockerfile += `

# Install Go ${goVersion}
RUN wget https://go.dev/dl/go${goVersion}.linux-amd64.tar.gz && \\
    tar -C /usr/local -xzf go${goVersion}.linux-amd64.tar.gz && \\
    rm go${goVersion}.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin:/home/morphbox/go/bin`;

      if (goPackages.length > 0) {
        dockerfile += `
RUN su - morphbox -c "go install ${goPackages.join(' && go install ')}"`;
      }
    }

    // Add environment variables
    for (const [key, value] of Object.entries(env)) {
      dockerfile += `\nENV ${key}="${value}"`;
    }

    // Add post-create script if specified
    const postCreate = this.configManager.getConfig().scripts?.post_create;
    if (postCreate) {
      dockerfile += `

# Run post-create script
RUN echo '${postCreate.replace(/'/g, "'\\''")}' | bash`;
    }

    dockerfile += `

# Set up working directory
WORKDIR /workspace
RUN chown -R morphbox:morphbox /workspace

USER morphbox`;

    // Add pre-start script if specified
    const preStart = this.configManager.getConfig().scripts?.pre_start;
    if (preStart) {
      dockerfile += `

# Pre-start script will be run when container starts
RUN echo '${preStart.replace(/'/g, "'\\''")}' > /home/morphbox/.morphbox-prestart.sh && \\
    chmod +x /home/morphbox/.morphbox-prestart.sh`;
    }

    // Expose ports
    if (ports.length > 0) {
      dockerfile += `

EXPOSE 22 ${ports.join(' ')}`;
    } else {
      dockerfile += `

EXPOSE 22`;
    }

    dockerfile += `

CMD ["/usr/sbin/sshd", "-D"]`;

    return dockerfile;
  }

  getImageName(): string {
    return this.imageName;
  }

  getDockerRunArgs(): string[] {
    const args: string[] = [
      'run',
      '-d',
      '--name', 'morphbox-vm',
      '-v', `${process.cwd()}:/workspace`,
      '-p', '2222:22'
    ];

    // Add config-based args
    const configArgs = this.configManager.getDockerRunArgs();
    args.push(...configArgs);

    // Add image name
    args.push(this.imageName);

    return args;
  }
}