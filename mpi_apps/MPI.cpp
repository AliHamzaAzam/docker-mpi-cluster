#include <mpi.h>
#include <iostream>
#include <vector>
#include <string>
#include <cstring> // For memset

// Headers for networking functions
#include <netdb.h>
#include <arpa/inet.h>
#include <sys/socket.h>

// Function to resolve hostname to IP address
std::string get_ip_from_hostname(const char* hostname) {
    struct hostent *host_entry;
    struct in_addr **addr_list;
    char ip_buffer[INET_ADDRSTRLEN]; // Buffer for IPv4 address string

    host_entry = gethostbyname(hostname);
    if (host_entry == nullptr) {
        // Consider using herror("gethostbyname") for more detailed error
        return "Hostname resolution failed";
    }

    addr_list = (struct in_addr **)host_entry->h_addr_list;

    if (addr_list[0] != nullptr) {
        // Convert the first IP address to string format
        if (inet_ntop(AF_INET, addr_list[0], ip_buffer, sizeof(ip_buffer)) != nullptr) {
            return std::string(ip_buffer);
        } else {
            return "IP conversion failed";
        }
    }

    return "No IP address found";
}


int main(int argc, char* argv[]) {
    // Initialize the MPI environment
    MPI_Init(&argc, &argv);

    // Get the number of processes (world size)
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the current process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    // Get the name of the processor (hostname)
    char processor_name[MPI_MAX_PROCESSOR_NAME];
    int name_len;
    MPI_Get_processor_name(processor_name, &name_len);

    // Resolve hostname to IP address
    std::string ip_address = get_ip_from_hostname(processor_name);

    // Print the rank, processor name, and IP address using std::cout
    std::cout << "Rank " << world_rank << " of " << world_size
              << " is running on processor: " << processor_name
              << " (IP: " << ip_address << ")" << std::endl;

    // Finalize the MPI environment
    MPI_Finalize();

    return 0;
}