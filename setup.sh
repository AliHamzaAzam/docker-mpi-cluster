#!/bin/bash

# Script to generate the hostfile for MPI and test SSH connectivity

# Function to handle errors
error_exit() {
    echo "Error: $1"
    exit 1
}

echo "Setting up MPI cluster..."

# Wait for containers to be ready
echo "Waiting for all nodes to be ready..."
sleep 5

# Create hostfile
echo "Generating hostfile for MPI..."
cat > /home/mpiuser/hostfile << EOL
master slots=1
worker1 slots=1
worker2 slots=1
EOL

echo "Hostfile created at /home/mpiuser/hostfile"
echo "Hostfile contents:"
cat /home/mpiuser/hostfile

echo "Testing SSH connections..."
for host in master worker1 worker2; do
    # Using SSH with options to suppress host key checking
    ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o UserKnownHostsFile=/dev/null $host hostname || {
        echo "Failed to connect to $host, trying as mpiuser..."
        sudo -u mpiuser ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o UserKnownHostsFile=/dev/null $host hostname || {
            echo "SSH to $host failed as mpiuser too."
            echo "Debugging SSH connection issues..."
            echo "Checking if SSH keys are set up correctly..."
            ls -la ~/.ssh/
            echo "Checking SSH daemon status..."
            service ssh status
            error_exit "SSH to $host failed"
        }
    }
done

echo "MPI cluster setup complete. You can now run MPI applications."

echo "Example: mpirun --hostfile /home/mpiuser/hostfile -np 3 /home/mpiuser/mpi_apps/hello_world"