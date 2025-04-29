#include <iostream>
#include <vector>
#include <omp.h> // Include OpenMP header

int main() {
    std::cout << "Starting OpenMP test..." << std::endl;

    // Set the number of threads to use (optional, often defaults to number of cores)
    // You can also control this with the OMP_NUM_THREADS environment variable
    // omp_set_num_threads(4); 

    // Parallel region: Code inside this block is executed by multiple threads
    #pragma omp parallel
    {
        // Get the total number of threads in this parallel region
        int num_threads = omp_get_num_threads();
        // Get the unique ID of the current thread (0 to num_threads-1)
        int thread_id = omp_get_thread_num();

        // Ensure only one thread prints the total count
        #pragma omp single
        {
            std::cout << "Parallel region executing with " << num_threads << " threads." << std::endl;
        }

        // Each thread prints its ID
        // Use a critical section to prevent garbled output from simultaneous cout calls
        #pragma omp critical
        {
            std::cout << "Hello from thread " << thread_id << std::endl;
        }
    } // End of parallel region

    std::cout << "OpenMP test finished." << std::endl;

    return 0;
}