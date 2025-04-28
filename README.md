# Lightweight MPI Cluster with Docker

This repository contains a lightweight Beowulf cluster implementation using Docker containers and OpenMPI. This setup creates one master node and two worker nodes connected in a private Docker network, suitable for developing and testing MPI applications locally.

## Features

-   Lightweight Docker containers based on Debian Bullseye Slim.
-   OpenMPI pre-installed and configured.
-   Passwordless SSH authentication between nodes for the `mpiuser`.
-   Shared volume (`mpi_apps`) for easy access and modification of MPI applications from the host.
-   Example applications included (C and C++).
-   Ready for VS Code Remote-SSH connection.

## Prerequisites

-   Docker
-   Docker Compose
-   Git (for cloning the repository)
-   VS Code with the "Remote - SSH" extension (optional, for IDE integration)

## Quick Start

1.  **Clone this repository:**
    ```bash
    git clone https://github.com/AliHamzaAzam/docker-mpi-cluster.git
    cd docker-mpi-cluster
    ```

2.  **Build and start the cluster:**
    This command builds the Docker images (if they don't exist) and starts the master and worker containers in the background.
    ```bash
    docker-compose up -d --build
    ```

3.  **Connect to the master node as `mpiuser`:**
    It's important to connect as `mpiuser`, not `root`, to run MPI commands correctly.
    ```bash
    docker exec -it -u mpiuser mpi_master bash
    ```

4.  **Run the setup script (inside the container):**
    This script generates the necessary MPI hostfile and tests SSH connectivity between nodes.
    ```bash
    bash /home/mpiuser/setup.sh
    ```
    *(You only need to run this once after starting the containers, unless you restart them).*

5.  **Compile the example MPI applications (inside the container):**
    Navigate to the shared applications directory and use the Makefile.
    ```bash
    cd /home/mpiuser/mpi_apps
    make clean # Optional: remove old executables
    make
    ```

6.  **Run the example applications (inside the container):**
    *   **C Example:**
        ```bash
        mpirun --hostfile /home/mpiuser/hostfile -np 3 /home/mpiuser/mpi_apps/hello_world
        ```
    *   **C++ Example (prints hostname and IP):**
        ```bash
        mpirun --hostfile /home/mpiuser/hostfile -np 3 /home/mpiuser/mpi_apps/MPI
        ```
    *   **OpenMP Example (runs on the master node):**
        The `make` command already compiled the OpenMP test. Run it directly:
        ```bash
        /home/mpiuser/mpi_apps/openmp_test
        ```


## Working with MPI Applications

-   Place your MPI source code (C or C++) in the `mpi_apps` directory on your host machine.
-   These files will automatically appear in `/home/mpiuser/mpi_apps` inside all containers thanks to the shared volume.
-   Modify the `mpi_apps/Makefile` to add rules for compiling your own applications.
-   Compile and run your applications from within the `mpi_master` container (connected as `mpiuser`).

## Connecting with VS Code (Remote-SSH)

You can connect VS Code directly to the `mpi_master` container for a seamless development experience:

1.  Ensure the "Remote - SSH" extension (`ms-vscode-remote.remote-ssh`) is installed in VS Code.
2.  Open the Command Palette (Cmd+Shift+P or Ctrl+Shift+P).
3.  Select `Remote-SSH: Connect to Host...`.
4.  Choose `+ Add New SSH Host...`.
5.  Enter the command: `ssh mpiuser@localhost -p 2222`
6.  Select your SSH configuration file (e.g., `~/.ssh/config`).
7.  Connect to the newly added host (e.g., `localhost` on port 2222).
8.  When prompted for the password, enter `mpiuser`.
9.  Once connected, open the folder `/home/mpiuser/mpi_apps` within VS Code to access your shared application files.

## Modifying the Cluster

-   To add more worker nodes, modify the `docker-compose.yml` file and update the `setup.sh` script accordingly.
-   To change the number of slots per node, edit the `setup.sh` script where the `hostfile` is generated.

## Multi-Laptop Setup

For instructions on extending this cluster across multiple physical machines, see the `multi_laptop_setup.md` file.

## Shutting Down

To stop and remove the containers and network:
```bash
docker-compose down