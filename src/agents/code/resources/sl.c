//Nicholas Mirigliani
//I pledge my honor that I have abided by the Stevens Honor System

#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <dirent.h>
#include <sys/stat.h>
#include <wait.h>

#define READ_END 0
#define WRITE_END 1
#define NUM 5
#define BUFSIZE 32


void err(char* msg, int code){
    fprintf(stderr, "%s", msg);
    exit(code);
}

int main(int argc, char* argv[]){

    //Input checking and directory validation.
    if(argc != 2) err("Incorrect number of arguments (should be 1).", EXIT_FAILURE);
    struct stat dirinfo;
    //Manually check for root, because stat() does not have permissions to access.
    if (strcmp(argv[1], "/root") == 0 || strcmp(argv[1], "/root/") == 0) {
        fprintf(stderr, "Permission denied. %s cannot be read.", argv[1]);
        exit(EXIT_FAILURE);
    }
    if(stat(argv[1], &dirinfo) == -1){
        fprintf(stderr, "Permission denied. %s cannot be read.", argv[1]);
        exit(EXIT_FAILURE);
    }
    if(!S_ISDIR(dirinfo.st_mode)) err("The first argument has to be a directory.", EXIT_FAILURE);

    if(!(S_IRUSR & (dirinfo.st_mode))){
        fprintf(stderr, "Permission denied. %s cannot be read.", argv[1]);
        exit(EXIT_FAILURE);
    }

    int fd_outer[2];
    if(pipe(fd_outer) == -1) err("outer pipe() failed.", EXIT_FAILURE);
    pid_t p = fork();
    if(p == -1) err("outer fork() failed.", EXIT_FAILURE);

    // child
    if (p == 0) {
        int  fd_inner[2];
        if(pipe(fd_inner) == -1) err("inner pipe() failed.", EXIT_FAILURE);

        pid_t e = fork();
        if(e == -1) err("inner fork() failed.", EXIT_FAILURE);

        //child-child
        if(e == 0){
            if(close(fd_inner[READ_END]) == -1) err("close() failed.", EXIT_FAILURE);
            //Redirect the ls from stdout to the pipe.
            if(dup2(fd_inner[WRITE_END], 1) == -1) err("dup2() failed.", EXIT_FAILURE);
            execl("/bin/ls", "ls", "-1ai", argv[1], NULL);
            err("ls failed.", EXIT_FAILURE);
        }
        //child-parent 
        else {
            int status;
            waitpid(e, &status, 0);
            if(status == -1) err("waitpid() failed.", EXIT_FAILURE);
            if(close(fd_outer[READ_END]) == -1) err("close() failed.", EXIT_FAILURE);
            if(close(fd_inner[WRITE_END]) == -1) err("close() failed.", EXIT_FAILURE);

            //Read the ls output from the pipe as stdin.
            if(dup2(fd_inner[READ_END], 0) == -1) err("dup2() failed.", EXIT_FAILURE);
            //Redirect the sort from stdout to the pipe.
            if(dup2(fd_outer[WRITE_END], 1) == -1) err("dup2() failed.", EXIT_FAILURE);

            execl("/usr/bin/sort", "sort", NULL);

            //OLD CODE BELOW (trying to read as string first.)

            // int  nbytes;
            // char buffer[BUFSIZE+1];
            // char message[4096];
            // memset(message, 0, sizeof message);

            // while ((nbytes = read(fd_inner[READ_END], buffer, BUFSIZE)) != 0) {
            //     if(nbytes < 0) err("read() failed.", EXIT_FAILURE);
            //     if (nbytes > 0) {
            //         buffer[nbytes] = 0;
            //         strcat(message, buffer);
            //     }
                
            // }
            // if(close(fd_inner[READ_END]) == -1) err("close() failed.", EXIT_FAILURE);
            // printf("Output received from pipe:\n%s", message);
            // char* items[4096];
            // items[0] = "sort";
            // char* delim = "\n";
            // char* next = strtok(message, delim);
            // int idx = 1;
            // while (next != NULL) {
            //     items[idx++] = next;
            //     next = strtok(NULL, delim);
            // }

            // if(close(fd_outer[READ_END]) == -1) err("close() failed.", EXIT_FAILURE);
            // dup2(fd_outer[WRITE_END], 1);
            // execvp("sort", items);
            // err("sort failed.", EXIT_FAILURE);
        } 
    }

    // parent
    else {
        int status;
        waitpid(p, &status, 0);
        if(status == -1) err("waitpid() failed.", EXIT_FAILURE);

        int  nbytes;
        char buffer[BUFSIZE+1];
        char message[4096];
        memset(message, 0, sizeof message);

        if(close(fd_outer[WRITE_END]) == -1) err("close() failed.", EXIT_FAILURE);
        // printf("%d exited with status %d\n", p, status);
        while ((nbytes = read(fd_outer[READ_END], buffer, BUFSIZE)) != 0) {
                if(nbytes < 0) err("read() failed.", EXIT_FAILURE);
                if (nbytes > 0) {
                    buffer[nbytes] = 0;
                    strcat(message, buffer);
                }
        }
        if(close(fd_outer[READ_END]) == -1) err("close() failed.", EXIT_FAILURE);
        int count = 0;
        for(int i = 0; i < strlen(message); i++){
            if(message[i]=='\n') count++;
        }
        printf("%sTotal files: %d\n", message, count);
    }

}