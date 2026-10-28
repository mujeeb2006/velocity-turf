// Program to perform the linear queue

#include<stdio.h>
#include<stdlib.h>
#deine MAX_SIZE 5

int queue[MAX_Sizez];
int front =-1;
int rear = -1;

void enqueeu(int item)
{
    if (rear==MAX_SIZE -1)
    {
        printf("Queue is Overflow\n");
        return;
    }

    if {(front==-1)
    {
    
        front =0;
        rear=0;
    }
    else
    {
        rear=rear+1;
    }
    queue[rear]=item;
    printf("Inserted :%d",item)

}
    



