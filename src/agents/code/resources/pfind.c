//Nicholas Mirigliani
//I pledge my honor that I have abided by the Stevens Honor System.

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/stat.h>
#include <stdbool.h>

// #define TEST
// #define PRINT

bool pEqual(char* pstring, int st_mode){
    if((pstring[0] == 'r' && (S_IRUSR & st_mode) == 0 ||
        pstring[0] == '-' && (S_IRUSR & st_mode) != 0)){
        return false;
    }
    if((pstring[1] == 'w' && (S_IWUSR & st_mode) == 0 ||
        pstring[1] == '-' && (S_IWUSR & st_mode) != 0)){
        return false;
    }
    if((pstring[2] == 'x' && (S_IXUSR & st_mode) == 0 ||
        pstring[2] == '-' && (S_IXUSR & st_mode) != 0)){
        return false;
    }
    if((pstring[3] == 'r' && (S_IRGRP & st_mode) == 0 ||
        pstring[3] == '-' && (S_IRGRP & st_mode) != 0)){
        return false;
    }
    if((pstring[4] == 'w' && (S_IWGRP & st_mode) == 0 ||
        pstring[4] == '-' && (S_IWGRP & st_mode) != 0)){
        return false;
    }
    if((pstring[5] == 'x' && (S_IXGRP & st_mode) == 0 ||
        pstring[5] == '-' && (S_IXGRP & st_mode) != 0)){
        return false;
    }
    if((pstring[6] == 'r' && (S_IROTH & st_mode) == 0 ||
        pstring[6] == '-' && (S_IROTH & st_mode) != 0)){
        return false;
    }
    if((pstring[7] == 'w' && (S_IWOTH & st_mode) == 0 ||
        pstring[7] == '-' && (S_IWOTH & st_mode) != 0)){
        return false;
    }
    if((pstring[8] == 'x' && (S_IXOTH & st_mode) == 0 ||
        pstring[8] == '-' && (S_IXOTH & st_mode) != 0)){
        return false;
    }
    return true;
}

void scanDir(char* pstring){
    // unsigned int cur_perms;
    char* filename;
    struct stat fileinfo;
    char* cwd = getcwd(NULL, 0);
    DIR* dir = opendir(cwd);
    struct dirent *cur_file = readdir(dir);
    while(cur_file != NULL){
        filename = cur_file->d_name;
        if(strcmp(filename,".") != 0 && strcmp(filename,"..") != 0){
            stat(filename, &fileinfo);
            // cur_perms = fileinfo.st_mode & 0x1FF;
            if(S_ISREG(fileinfo.st_mode)){
                #ifdef PRINT
                    printf("cur_perms for '%s':  %s\n", filename, permissionsToString(cur_perms));
                #endif
                if(pEqual(pstring, fileinfo.st_mode)) fprintf(stdout, "%s/%s\n",cwd, filename);
            } else if(S_ISDIR(fileinfo.st_mode)){
                chdir(filename);
                scanDir(pstring);
                chdir(cwd);
            }
        } 
        cur_file = readdir(dir);
    }
    closedir(dir);
    free(cwd);
}

int main(int argc, char *argv[]){
    char *pstring = argv[2];
    int plength = strlen(pstring);
    // printf("%s is %ld characters long",input, strlen(input));
    char* checkString = "rwxrwxrwx";
    if(plength != 9){
        fprintf(stderr, "Error: Permissions string '%s' is invalid.\n", pstring);
        return EXIT_FAILURE;
    } 
    else {
        for(int i = 0; i < plength; i++){
            if(pstring[i] != checkString[i] && pstring[i] != '-'){
                fprintf(stderr, "Error: Permissions string '%s' is invalid.\n", pstring);
                return EXIT_FAILURE;
            }
        }
    }
    // unsigned int pbin = 0;
    // for(int i = 0; i < plength; i++){
    //     if(pstring[i] != '-'){
    //         pbin++;
    //     }
    //     pbin = pbin << 1;
    // }
    // pbin = pbin >> 1;

    #ifdef PRINT
        printf("pbin for '%s':  %s\n", pstring, permissionsToString(pbin));
    #endif
    
    #ifdef TEST
        chdir(".");
        scanDir(pstring);
    #else
        chdir(argv[1]);
        scanDir(pstring);
    #endif
}