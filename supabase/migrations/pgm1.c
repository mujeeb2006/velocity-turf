#include<Stdio.h>
#include<Stdlib.h>
struct Data
{
    char *day;
    int date;
    char*activity;
}calender[7]


void create(){
for(i=0;i<=7;i++){
calneder[i].name=(char*)malloc(20*sizeof(char))
calneder[i].activity=(char*)malloc(100*sizeof(char))
}
}

void read(){
for(i=0;i<=7;i++){
    printf("ENter the day\n");
    scanf("%s",calender[i].name");

    printf("ENter the date\n");
    scanf("%d",calender[i].date);

    printf("Enter the activity\n");
    scanf("%[^\]",calender[i].activity);

    }
    }
    void display(){
    printf("\nDay\ttDate\tActivity\n");
    printf("---------------------\n");
    for(i=0;i<=7;i++){
    prinf("%-10s\t%d\t%s\n",calender[i].day,calender[i].date,calender[i].activity);
    }
    }

    int main(){
    printf("Creating a calender\n");
    create();
    printf("Reading  calender entries ...\n");
    read();
    printf("Displaying calender entries ... \n);
    display();
    }
    for(i=o;i<=7;i++){
        free(calender*day);
        free(calender*activity);
    }
    return0;
}