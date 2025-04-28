FROM debian:bullseye-slim

# Set fixed values for user/group to avoid variable expansion issues
ENV USERNAME=mpiuser
ENV USER_UID=1000
ENV USER_GID=1000

# Install necessary packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server \
    openssh-client \
    openmpi-bin \
    openmpi-common \
    libopenmpi-dev \
    build-essential \
    supervisor \
    iputils-ping \
    net-tools \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Configure SSH
RUN mkdir -p /var/run/sshd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#StrictHostKeyChecking ask/StrictHostKeyChecking no/' /etc/ssh/ssh_config

# Setup MPI user
RUN groupadd --gid ${USER_GID} ${USERNAME} && \
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