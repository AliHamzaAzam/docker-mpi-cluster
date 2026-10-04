#include <mpi.h>
#include <stdio.h>
#include <stdlib.h>
/* Equal chunks of [1..16], square each value, gather in original order. */
int main(int argc, char **argv) {
    int rank, size, input[16], output[16], local[16];
    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    if (size != 1 && size != 2 && size != 4) {
        if (!rank) fprintf(stderr, "Use 1, 2, or 4 ranks.\n");
        MPI_Finalize();
        return 2;
    }
    for (int i = 0; i < 16; i++) input[i] = i + 1;
    MPI_Barrier(MPI_COMM_WORLD);
    double start = MPI_Wtime();
    MPI_Scatter(input, 16 / size, MPI_INT, local, 16 / size, MPI_INT, 0, MPI_COMM_WORLD);
    for (int i = 0; i < 16 / size; i++) local[i] *= local[i];
    MPI_Gather(local, 16 / size, MPI_INT, output, 16 / size, MPI_INT, 0, MPI_COMM_WORLD);
    double elapsed = MPI_Wtime() - start, maximum;
    MPI_Reduce(&elapsed, &maximum, 1, MPI_DOUBLE, MPI_MAX, 0, MPI_COMM_WORLD);
    if (!rank) {
        int sum = 0;
        for (int i = 0; i < 16; i++) {
            if (output[i] != (i + 1) * (i + 1)) MPI_Abort(MPI_COMM_WORLD, 3);
            sum += output[i];
        }
        printf("ranks=%d checksum=%d kernel_seconds=%.9f output=", size, sum, maximum);
        for (int i = 0; i < 16; i++) printf("%s%d", i ? "," : "", output[i]);
        printf("\n");
    }
    MPI_Finalize();
    return 0;
}
