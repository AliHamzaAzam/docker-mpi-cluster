FROM debian:bullseye-slim

# Set fixed values for user/group to avoid variable expansion issues
ENV USERNAME=mpiuser
ENV USER_UID=1000
ENV USER_GID=1000
ENV CMAKE_VERSION=3.21.0 
ENV CMAKE_INSTALL_PATH=/opt/cmake

# Optional: Switch Debian mirror if default is unreliable
RUN sed -i 's/deb.debian.org/ftp.de.debian.org/g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org/debian-security|ftp.de.debian.org/debian-security|g' /etc/apt/sources.list

# Install necessary packages (including METIS, sudo, supervisor, wget, ca-certificates)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssh-server \
    openssh-client \
    openmpi-bin \
    openmpi-common \
    libopenmpi-dev \
    build-essential \
    gdb \
    iproute2 \
    iputils-ping \
    vim \
    sudo \
    supervisor \
    wget \
    libmetis-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and install newer CMake based on architecture
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    ARCH=$(dpkg --print-architecture) && \
    case ${ARCH} in \
        amd64) CMAKE_ARCH="x86_64";; \
        arm64) CMAKE_ARCH="aarch64";; \
        *) echo "Unsupported architecture: ${ARCH}"; exit 1;; \
    esac && \
    wget https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}-linux-${CMAKE_ARCH}.sh \
        -O /tmp/cmake-install.sh && \
    mkdir -p ${CMAKE_INSTALL_PATH} && \
    sh /tmp/cmake-install.sh --skip-license --prefix=${CMAKE_INSTALL_PATH} && \
    rm /tmp/cmake-install.sh && \
    apt-get purge -y --auto-remove curl && \
    rm -rf /var/lib/apt/lists/*

# Add CMake to PATH
ENV PATH="${CMAKE_INSTALL_PATH}/bin:${PATH}"

# Configure SSH
RUN mkdir -p /var/run/sshd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#StrictHostKeyChecking ask/StrictHostKeyChecking no/' /etc/ssh/ssh_config

# Setup MPI user
RUN mkdir -p /etc/sudoers.d && \
    groupadd --gid ${USER_GID} ${USERNAME} && \
    useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} && \
    echo "${USERNAME}:${USERNAME}" | chpasswd && \
    echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} && \
    chmod 0440 /etc/sudoers.d/${USERNAME}

# Copy setup script
COPY setup.sh /home/${USERNAME}/setup.sh
RUN chown ${USERNAME}:${USERNAME} /home/${USERNAME}/setup.sh && \
    chmod +x /home/${USERNAME}/setup.sh

USER ${USERNAME}
WORKDIR /home/${USERNAME}

# Configure SSH client for mpiuser to ignore host key checking
RUN mkdir -p ~/.ssh && \
    echo "Host *" > ~/.ssh/config && \
    echo "  StrictHostKeyChecking no" >> ~/.ssh/config && \
    chmod 600 ~/.ssh/config

# Setup SSH keys for passwordless authentication
RUN mkdir -p ~/.ssh && chmod 700 ~/.ssh && \
    ssh-keygen -t rsa -N "" -f ~/.ssh/id_rsa && \
    cp ~/.ssh/id_rsa.pub ~/.ssh/authorized_keys && \
    chmod 600 ~/.ssh/authorized_keys

USER root

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# SSH login fix
RUN mkdir -p /run/sshd

EXPOSE 22

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]