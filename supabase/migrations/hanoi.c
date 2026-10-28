malloc 
syntax: (int*)malloc(sizeof(int))


(int*)calloc(num_elements ,sizeof(int))

free(pointer)
free(pi)
realloc(pointer,new_size)
realloc(p,s)


#tower of hanoi

#include<stdio.h>

void hanoi (int n,char source,char auxillary, char destination)

{
    if(n==1)
    printf("Move disk 1 form %c to %c\n");
    return;
}

hanoi(n-1,source,destination,auxillary)

printf("Move disk %d from %c to %c",n ,source,destination)

hanoi(n - 1,auxillary,source,destinatipn)
}
int main(void)
{
    hanoi(3,A,B,C);
    return 0;
}
