FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y --no-install-recommends build-essential openmpi-bin libopenmpi-dev openssh-server openssh-client python3 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /run/sshd /root/.ssh && ssh-keygen -q -t ed25519 -N '' -f /root/.ssh/id_ed25519 && cp /root/.ssh/id_ed25519.pub /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && printf 'Host *\n StrictHostKeyChecking no\n UserKnownHostsFile /dev/null\n LogLevel ERROR\n' > /root/.ssh/config
COPY mpi_apps /apps
COPY benchmarks/scatter_compute_gather.c /apps/scatter_compute_gather.c
RUN cd /apps && make && mpicc -Wall -Wextra -O2 scatter_compute_gather.c -o scatter_compute_gather
CMD ["/usr/sbin/sshd", "-D", "-e"]
