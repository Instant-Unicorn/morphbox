import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface MorphboxConfig {
  container?: {
    packages?: string[];
    environment?: Record<string, string>;
    ports?: number[];
    shell?: string;
  };
  network?: {
    allowlist?: string[];
    blocklist?: string[];
  };
  security?: {
    no_network?: boolean;
    readonly_root?: boolean;
    memory_limit?: string;
    cpu_limit?: number;
  };
  development?: {
    runtimes?: {
      node?: string;
      python?: string;
      go?: string;
    };
    npm_packages?: string[];
    pip_packages?: string[];
    go_packages?: string[];
  };
  scripts?: {
    post_create?: string;
    pre_start?: string;
  };
}

export class ConfigManager {
  private config: MorphboxConfig = {};
  private configPath: string | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const possiblePaths = [
      path.join(process.cwd(), 'morphbox.yml'),
      path.join(process.cwd(), 'morphbox.yaml'),
      path.join(process.cwd(), '.morphbox.yml'),
      path.join(process.cwd(), '.morphbox.yaml'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        try {
          const fileContents = fs.readFileSync(configPath, 'utf8');
          this.config = yaml.load(fileContents) as MorphboxConfig || {};
          this.configPath = configPath;
          console.log(`Loaded configuration from ${configPath}`);
          break;
        } catch (error) {
          console.warn(`Failed to parse config file ${configPath}:`, error);
        }
      }
    }

    if (!this.configPath) {
      console.log('No morphbox.yml configuration file found, using defaults');
    }
  }

  public getConfig(): MorphboxConfig {
    return this.config;
  }

  public getPackages(): string[] {
    return this.config.container?.packages || [];
  }

  public getEnvironment(): Record<string, string> {
    return this.config.container?.environment || {};
  }

  public getAdditionalPorts(): number[] {
    return this.config.container?.ports || [];
  }

  public getShell(): string {
    return this.config.container?.shell || '/bin/bash';
  }

  public getAllowedDomains(): string[] | null {
    return this.config.network?.allowlist || null;
  }

  public getBlockedDomains(): string[] {
    return this.config.network?.blocklist || [];
  }

  public isNetworkDisabled(): boolean {
    return this.config.security?.no_network || false;
  }

  public getMemoryLimit(): string | null {
    return this.config.security?.memory_limit || null;
  }

  public getCpuLimit(): number | null {
    return this.config.security?.cpu_limit || null;
  }

  public getDockerfileContent(): string {
    const packages = this.getPackages();
    const nodeVersion = this.config.development?.runtimes?.node;
    const pythonVersion = this.config.development?.runtimes?.python;
    const goVersion = this.config.development?.runtimes?.go;
    const npmPackages = this.config.development?.npm_packages || [];
    const pipPackages = this.config.development?.pip_packages || [];
    const goPackages = this.config.development?.go_packages || [];

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
    lsb-release`;

    if (packages.length > 0) {
      dockerfile += ` \\\n    ${packages.join(' \\\n    ')}`;
    }

    dockerfile += ` && \\
    apt-get clean && \\
    rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -s /bin/bash -u 1000 morphbox && \\
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers`;

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
    apt-get install -y python${pythonVersion} python${pythonVersion}-pip`;

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
ENV PATH=$PATH:/usr/local/go/bin`;

      if (goPackages.length > 0) {
        dockerfile += `
RUN go install ${goPackages.join(' && go install ')}`;
      }
    }

    // Add environment variables
    const env = this.getEnvironment();
    for (const [key, value] of Object.entries(env)) {
      dockerfile += `\nENV ${key}="${value}"`;
    }

    // Add post-create script if specified
    if (this.config.scripts?.post_create) {
      dockerfile += `

# Run post-create script
RUN echo '${this.config.scripts.post_create.replace(/'/g, "'\\''")}' | bash`;
    }

    dockerfile += `

WORKDIR /workspace
USER morphbox`;

    return dockerfile;
  }

  public getDockerRunArgs(): string[] {
    const args: string[] = [];

    // Memory limit
    const memLimit = this.getMemoryLimit();
    if (memLimit) {
      args.push('--memory', memLimit);
    }

    // CPU limit
    const cpuLimit = this.getCpuLimit();
    if (cpuLimit) {
      args.push('--cpus', cpuLimit.toString());
    }

    // Additional ports
    const ports = this.getAdditionalPorts();
    for (const port of ports) {
      args.push('-p', `${port}:${port}`);
    }

    // Network isolation
    if (this.isNetworkDisabled()) {
      args.push('--network', 'none');
    }

    // Read-only root filesystem
    if (this.config.security?.readonly_root) {
      args.push('--read-only');
      args.push('--tmpfs', '/tmp');
      args.push('--tmpfs', '/var/tmp');
    }

    return args;
  }

  public shouldAllowDomain(domain: string): boolean {
    const allowlist = this.getAllowedDomains();
    const blocklist = this.getBlockedDomains();

    // Check blocklist first
    if (this.matchesDomainPattern(domain, blocklist)) {
      return false;
    }

    // If no allowlist, allow by default (unless blocked)
    if (!allowlist || allowlist.length === 0) {
      return true;
    }

    // Check allowlist
    return this.matchesDomainPattern(domain, allowlist);
  }

  private matchesDomainPattern(domain: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern.startsWith('*.')) {
        // Wildcard subdomain matching
        const baseDomain = pattern.slice(2);
        if (domain === baseDomain || domain.endsWith('.' + baseDomain)) {
          return true;
        }
      } else if (domain === pattern) {
        // Exact match
        return true;
      }
    }
    return false;
  }
}