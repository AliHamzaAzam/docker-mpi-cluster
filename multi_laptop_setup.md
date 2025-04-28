# Running MPI Cluster Across Multiple Laptops

This document explains how to extend the Docker-based MPI cluster to work across multiple physical machines (laptops).

## Prerequisites

- Docker and Docker Compose installed on all laptops
- All laptops must be on the same network (or have network connectivity to each other)
- SSH access between all laptops
  - **Note:** This refers to having SSH enabled on the *host operating system* of each laptop, allowing you to connect from one laptop's terminal directly to another's (e.g., `ssh user@other_laptop_ip`). This is generally good practice for managing multiple machines but is *not* strictly required for the container-to-container communication used by MPI in this setup (which relies on the SSH server *inside* the containers). To enable host SSH:
    - **macOS:** System Settings > General > Sharing > Enable Remote Login.
    - **Linux:** Install `openssh-server` and ensure the `sshd` service is running.
    - **Windows:** Install the `OpenSSH Server` optional feature and start the `sshd` service.
  - **(Optional but Recommended) Set up Key-Based Authentication:** To avoid password prompts when connecting between host laptops, set up SSH keys. On the connecting machine, use `ssh-keygen` to create a key pair if needed, then copy the public key (e.g., `~/.ssh/id_rsa.pub`) to the `~/.ssh/authorized_keys` file on the target machine. The `ssh-copy-id user@other_laptop_ip` command simplifies this process.

## Setup Process

### 1. Setup on the Master Laptop

Choose one laptop to serve as the "cluster coordinator" where you'll run the master node.

1. Clone the repository on this laptop
2. Modify the `docker-compose.yml` file to expose SSH ports for external connection:

```yaml
version: '3'

services:
  master:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mpi_master
    hostname: master
    networks:
      - mpi_net
    volumes:
      - ./mpi_apps:/home/mpiuser/mpi_apps
    ports:
      - "2222:22"  # Map SSH to host port

networks:
  mpi_net:
    driver: bridge
```

3. Build and start the master node:
```
docker-compose up -d --build master
```

4. Get the IP address of your master laptop:
```
ifconfig  # On macOS/Linux
ipconfig  # On Windows
```

### 2. Setup on Worker Laptops

On each worker laptop:

1. Clone the repository
2. Create a modified `docker-compose.yml` for each worker laptop:

```yaml
version: '3'

services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mpi_worker_laptop${LAPTOP_ID}
    hostname: worker_laptop${LAPTOP_ID}
    networks:
      - mpi_net
    volumes:
      - ./mpi_apps:/home/mpiuser/mpi_apps
    ports:
      - "2222:22"  # Map SSH to host port
    environment:
      - MASTER_IP=${MASTER_IP}  # IP address of the master laptop

networks:
  mpi_net:
    driver: bridge
```

3. Start the worker on each laptop, replacing the values with the appropriate IPs:
```
LAPTOP_ID=1 MASTER_IP=192.168.1.x docker-compose up -d --build worker
```

### 3. Setting Up SSH Access Between Nodes

1. On the master laptop, connect to the master container:
```
docker exec -it mpi_master bash
```

2. Generate an SSH key pair:
```
ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa
```

3. Copy the public key:
```
cat ~/.ssh/id_rsa.pub
```

4. On each worker laptop, connect to the worker container:
```
docker exec -it mpi_worker_laptopX bash
```

5. Create or append to the authorized_keys file:
```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PASTE_MASTER_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. Create a Hostfile on the Master Node

Connect to the master container and create a hostfile with all nodes' IPs:

```
cat > ~/hostfile << EOL
master slots=1
192.168.1.y slots=1  # IP of first worker laptop
192.168.1.z slots=1  # IP of second worker laptop
EOL
```

### 5. Test the Multi-Laptop Cluster

From the master container:

1. Test SSH connections:
```
ssh 192.168.1.y hostname
ssh 192.168.1.z hostname
```

2. Compile the example program:
```
cd ~/mpi_apps && make
```

3. Run the MPI program across all laptops:
```
mpirun -f ~/hostfile -np 3 ~/mpi_apps/hello_world
```

## Important Considerations

1. **Firewalls**: Ensure firewalls on all laptops allow SSH connections (port 22)
2. **Network Latency**: MPI performance across laptops will be much slower than within a single machine due to network latency
3. **Shared Code**: The MPI applications must be available at the same path on all nodes
4. **SSH Keys**: Proper SSH key exchange between all nodes is crucial for this setup
5. **IP Addresses**: Use static IPs or ensure the IPs don't change between sessions