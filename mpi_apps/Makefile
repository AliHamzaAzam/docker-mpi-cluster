# Compiler settings - Can be customized.
MPICC = mpicc
MPICXX = mpic++
CC = gcc
CXX = g++

# Compiler flags
CFLAGS = -Wall -Wextra -O2
CXXFLAGS = -Wall -Wextra -O2 -std=c++11
OMPFLAGS = -fopenmp # OpenMP flag
# CLFLAGS = -lOpenCL # OpenCL flag (Removed)

# Linker flags
LDFLAGS =

# MPI applications
MPI_APPS = hello_world MPI

# OpenMP applications
OMP_APPS = openmp_test

# All target executables
TARGETS = $(MPI_APPS) $(OMP_APPS) 

# Default target
all: $(TARGETS)

# Rule to compile C MPI applications
hello_world: hello_world.c
	$(MPICC) $(CFLAGS) $< -o $@ $(LDFLAGS)

# Rule to compile C++ MPI applications
MPI: MPI.cpp
	$(MPICXX) $(CXXFLAGS) $< -o $@ $(LDFLAGS)

# Rule to compile C++ OpenMP applications
openmp_test: openmp_test.cpp
	$(CXX) $(CXXFLAGS) $(OMPFLAGS) $< -o $@ $(LDFLAGS)

# Clean target
clean:
	rm -f $(TARGETS) *.o

.PHONY: all clean