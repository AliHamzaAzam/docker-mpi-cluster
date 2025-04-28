# Use mpic++ for C++ MPI programs
CXX = mpic++
# Use mpicc for C MPI programs
CC = mpicc

# C++ flags
CXXFLAGS = -Wall -O2 -std=c++11
# C flags
CFLAGS = -Wall -O2

# Default target: build both hello_world (C) and MPI (C++)
all: hello_world MPI

MPI: MPI.cpp # Removed utility.h dependency as the new MPI.cpp doesn't use it
	$(CXX) $(CXXFLAGS) -o $@ MPI.cpp 
# Rule to build the C MPI program
hello_world: hello_world.c
	$(CC) $(CFLAGS) -o $@ $< 
# Clean target
clean:
	rm -f hello_world MPI *.o 